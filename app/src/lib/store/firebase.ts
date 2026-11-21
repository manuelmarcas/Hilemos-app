// Almacén de datos de verdad: Firebase (Authentication + Firestore). Misma interfaz (Store, en types.ts) que el de
// demostración (demo.ts). Firebase se carga aparte (import dinámico): el modo demo no lo descarga.
//
// Colecciones (más detalle en el README, «Modelo de datos»):
//   polls/{pollId}                     la votación (PollData)
//   polls/{pollId}/votes/{uid}         participante y sus votos (Vote)
//   polls/{pollId}/chat/{msgId}        mensaje del chat (ChatMessage)
//   polls/{pollId}/private/access      correos permitidos de una votación privada (solo administradores)
//   users/{uid}                        perfil (Profile)
//   users/{uid}/polls/{pollId}         colección del usuario (LibraryEntry)
//   users/{uid}/groups/{groupId}       grupos del usuario (Group)
//   users/{uid}/tokens/{token}         dispositivos a los que mandar avisos

import type { FirebaseOptions } from "firebase/app";
import type { AuthCredential, User as FbUser } from "firebase/auth";
import type { DocumentData, DocumentReference, DocumentSnapshot, Query, QuerySnapshot, WriteBatch } from "firebase/firestore";
import { CHAT_LIMIT, ghostName, hasLimit, keepsVotesOnLeave, pickHeir } from "../model";
import { isNative, PUBLIC_ORIGIN } from "../native";
import type { AuthUser, ChatMessage, Group, Library, LibraryEntry, Poll, PollAccess, PollData, Profile, Store, Vote } from "../types";
import { isKeyEmail, newAccessKey, parseAccessKey } from "./accessKey";

/** Correo al que se mandó el enlace de entrada: al abrirlo en el mismo dispositivo no hay que volver a escribirlo. */
const LINK_EMAIL = "hilemos-link-email";
/** Escrituras por lote (Firestore admite como mucho 500). */
const BATCH_SIZE = 450;

const codeOf = (e: unknown) => (e as { code?: string } | null)?.code;

export async function createFirebaseStore(config: FirebaseOptions): Promise<Store> {
  const [{ initializeApp }, A, F] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(config);
  // En la app (Capacitor) no hay ventanas emergentes: el login con Google es nativo (googleCredential) y la
  // sesión se guarda en IndexedDB sin cargar el iframe de redirecciones de getAuth.
  const native = isNative();
  const auth = native ? A.initializeAuth(app, { persistence: A.indexedDBLocalPersistence }) : A.getAuth(app);
  auth.languageCode = "es"; // correos de Firebase (enlace de entrada) en castellano
  // Caché local (IndexedDB): al volver a escuchar una votación o la colección, Firestore solo cobra los
  // documentos que han cambiado (si han pasado menos de 30 min). También abre más rápido y funciona sin conexión.
  // Si el navegador no la permite (p. ej. modo privado), Firestore sigue funcionando solo en memoria.
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
  });
  const provider = new A.GoogleAuthProvider();

  // ---------- Referencias ----------
  const pollRef = (id: string) => F.doc(db, "polls", id);
  const votesCol = (id: string) => F.collection(db, "polls", id, "votes");
  const chatCol = (id: string) => F.collection(db, "polls", id, "chat");
  const accessRef = (id: string) => F.doc(db, "polls", id, "private", "access");
  const userRef = (uid: string) => F.doc(db, "users", uid);
  const libCol = (uid: string) => F.collection(db, "users", uid, "polls");
  const groupsCol = (uid: string) => F.collection(db, "users", uid, "groups");
  const tokensCol = (uid: string) => F.collection(db, "users", uid, "tokens");
  const withId = (s: DocumentSnapshot<DocumentData>): Poll | null =>
    (s.exists() ? ({ id: s.id, ...s.data() } as Poll) : null);
  const toMap = <T,>(snap: QuerySnapshot<DocumentData>) => {
    const o: Record<string, T> = {};
    snap.forEach(d => { o[d.id] = d.data() as T; });
    return o;
  };

  // ---------- Utilidades de lectura y escritura ----------

  /** Aplica `op` a todas las referencias, en lotes. */
  async function commitIn(refs: DocumentReference[], op: (b: WriteBatch, r: DocumentReference) => void) {
    for (let i = 0; i < refs.length; i += BATCH_SIZE) {
      const b = F.writeBatch(db);
      refs.slice(i, i + BATCH_SIZE).forEach(r => op(b, r));
      await b.commit();
    }
  }

  /**
   * Borra una votación para todos: primero sus votos, en lotes (las reglas consultan la votación para permitirlo, así
   * que aún debe existir), y luego la votación y sus correos permitidos, junto con lo que se pase en `extra`.
   * El chat no se puede borrar desde la app (las reglas no lo permiten) y se queda sin votación.
   */
  async function removePoll(id: string, extra?: (b: WriteBatch) => void) {
    const votes = await F.getDocs(votesCol(id));
    await commitIn(votes.docs.map(d => d.ref), (b, r) => b.delete(r));
    const b = F.writeBatch(db);
    b.delete(accessRef(id));
    b.delete(pollRef(id));
    extra?.(b);
    await b.commit();
  }

  /** Quita la votación de la lista del usuario, y el grupo que se queda vacío (`dropGroupId`), en el lote `b`. */
  function dropFromLibrary(b: WriteBatch, uid: string, pollId: string, dropGroupId?: string | null) {
    b.delete(F.doc(libCol(uid), pollId));
    if (dropGroupId) b.delete(F.doc(groupsCol(uid), dropGroupId));
  }

  /**
   * Escucha datos del propio usuario (users/{uid}/…), que siempre puede leer. Justo al entrar (sobre todo al juntar
   * dos formas de entrar en la misma cuenta) Firestore puede recibir la primera lectura antes que la sesión y
   * rechazarla con permission-denied, y la escucha se corta. En ese caso se renueva la sesión y se reintenta
   * (hasta 3 veces) antes de dar el error.
   */
  function ownSnapshot(uid: string, q: Query<DocumentData>, next: (s: QuerySnapshot<DocumentData>) => void, onErr?: (e: unknown) => void) {
    let unsub = () => {}, stopped = false, tries = 0, timer = 0;
    const start = () => {
      unsub = F.onSnapshot(q, next, async e => {
        if (stopped || codeOf(e) !== "permission-denied" || auth.currentUser?.uid !== uid || tries >= 3) { onErr?.(e); return; }
        tries++;
        await auth.currentUser?.getIdToken(true).catch(() => {});
        if (!stopped) timer = window.setTimeout(start, 400 * tries);
      });
    };
    start();
    return () => { stopped = true; clearTimeout(timer); unsub(); };
  }

  // ---------- Sesión ----------

  // Sin cuenta: la sesión anónima y la cuenta interna de la clave de acceso (sin Google ni correo de verdad).
  const isKeyOnly = (u: FbUser) =>
    u.isAnonymous || u.providerData.every(p => p.providerId === "password" && isKeyEmail(p.email));
  const hasKeyLink = (u: FbUser) => u.providerData.some(p => p.providerId === "password" && isKeyEmail(p.email));

  // Nombre elegido al entrar sin cuenta: el perfil se guarda en cuanto hay sesión, pero la sesión se anuncia antes
  // de que la escritura termine, así que de momento el nombre sale de aquí.
  let anonName = "";
  const toUser = (u: FbUser | null): AuthUser | null =>
    u && {
      uid: u.uid,
      name: u.displayName || (u.isAnonymous && anonName) || "Alguien",
      photo: u.photoURL || "",
      // El correo ficticio de la clave de acceso no es un correo de verdad.
      email: isKeyEmail(u.email) ? (u.providerData.find(p => p.providerId === "google.com")?.email || "").toLowerCase()
        : (u.email || "").toLowerCase(),
      anon: isKeyOnly(u),
      hasName: !!u.displayName || (u.isAnonymous && !!anonName),
    };

  // En la app: el selector de cuentas de Google del móvil, que devuelve la credencial para el SDK web.
  const nativeAuth = async () => (await import("@capacitor-firebase/authentication")).FirebaseAuthentication;
  async function googleCredential() {
    let idToken: string | undefined;
    try {
      idToken = (await (await nativeAuth()).signInWithGoogle()).credential?.idToken;
    } catch (e) {
      // Cerrar el selector de cuentas no es un error que haya que explicar con detalle.
      if (/cancel/i.test(String((e as Error)?.message || e))) throw Object.assign(new Error("cancelado"), { code: "auth/popup-closed-by-user" });
      throw e;
    }
    if (!idToken) throw new Error("Google no ha devuelto la sesión. Inténtalo de nuevo.");
    return A.GoogleAuthProvider.credential(idToken);
  }

  function currentUser() {
    const u = auth.currentUser;
    if (!u) throw new Error("No hay ninguna sesión abierta.");
    return u;
  }

  // ---------- Salir de una votación (también al eliminar la cuenta) ----------

  /**
   * Deja la votación `id` (ver leavePoll en types.ts). Quien se va pasa a un nombre sin dueño (uno por votación) en
   * sus mensajes del chat, en «Creador» si la creó y en sus votos si se quedan (ver keepsVotesOnLeave, model.ts).
   */
  async function leave(id: string, uid: string) {
    const snap = await F.getDoc(pollRef(id)).catch(() => null);
    if (!snap?.exists()) return;
    const poll = snap.data() as PollData;
    const ghost = ghostName();
    // El chat va primero: las reglas solo dejan leerlo (y renombrar los mensajes propios) a quien sigue dentro.
    try {
      const msgs = await F.getDocs(F.query(chatCol(id), F.where("uid", "==", uid)));
      await commitIn(msgs.docs.map(d => d.ref), (b, r) => b.update(r, { name: ghost }));
    } catch { /* sin chat o sin acceso a él (pendiente o rechazado) */ }
    if (poll.ownerUid === uid) {
      // La votación pasa a otra persona (pickHeir); si no queda nadie, se borra.
      const votes = toMap<Vote>(await F.getDocs(votesCol(id)));
      const heir = pickHeir(votes, uid, poll.admins);
      if (!heir) { await removePoll(id); return; }
      // El creador original se recuerda aunque la votación pase de mano varias veces.
      await F.updateDoc(pollRef(id), {
        ownerUid: heir, ownerName: votes[heir]?.name || "Alguien", admins: (poll.admins || []).filter(a => a !== heir),
        ...(poll.founder ? {} : { founder: uid, founderName: ghost }),
      });
    } else if (poll.admins?.includes(uid)) {
      await F.updateDoc(pollRef(id), { admins: F.arrayRemove(uid) }).catch(() => {});
    }
    // Sus votos: con la votación cerrada se quedan con un nombre sin dueño; abierta (o en desempate), se borran y su
    // plaza queda libre (con tope, el contador baja a la vez, como exigen las reglas).
    const vref = F.doc(votesCol(id), uid);
    const v = await F.getDoc(vref).catch(() => null);
    if (!v?.exists()) return;
    const status = v.get("status");
    const sad = { name: ghost, photo: "", gone: true };
    if (status === "rejected") { await F.updateDoc(vref, sad).catch(() => {}); return; } // no puede salir
    if (status === "pending" || !keepsVotesOnLeave(poll)) {
      const b = F.writeBatch(db);
      b.delete(vref);
      if (hasLimit(poll)) b.update(pollRef(id), { members: F.increment(-1) });
      await b.commit();
    } else {
      await F.updateDoc(vref, sad);
    }
  }

  return {
    mode: "firebase",

    // ---------- Sesión y cuenta ----------
    onAuth: cb => A.onAuthStateChanged(auth, u => cb(toUser(u))),
    async signIn(opts) {
      if (!opts?.anonymous) return native ? A.signInWithCredential(auth, await googleCredential()) : A.signInWithPopup(auth, provider);
      const name = (opts.name || "").trim() || "Alguien";
      anonName = name;
      const cred = await A.signInAnonymously(auth);
      // El nombre va en la sesión y, para que aguante una recarga, también en el perfil (si falla, no importa:
      // la sesión ya lo lleva).
      await A.updateProfile(cred.user, { displayName: name });
      F.setDoc(userRef(cred.user.uid), { name, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    },
    async signOut() {
      // En la app también se cierra la cuenta de Google del selector, para poder elegir otra la próxima vez.
      if (native) await (await nativeAuth()).signOut().catch(() => {});
      await A.signOut(auth);
    },
    async linkGoogle() {
      const u = currentUser();
      let cred: AuthCredential | null;
      if (native) {
        cred = await googleCredential();
        await A.linkWithCredential(u, cred);
      } else {
        cred = A.GoogleAuthProvider.credentialFromResult(await A.linkWithPopup(u, provider));
      }
      // Se vuelve a entrar con Google (mismo uid) para que la sesión deje de contar como «sin cuenta».
      if (cred) await A.signInWithCredential(auth, cred);
      const cur = auth.currentUser || u;
      // Con Google ya no hace falta la clave de acceso: se quita su cuenta interna (la clave deja de valer) y, si el
      // correo de la cuenta era el ficticio, se pone el de Google (si Firebase no deja cambiarlo directamente, manda
      // un correo para confirmarlo).
      if (hasKeyLink(cur)) await A.unlink(cur, "password");
      const gmail = cur.providerData.find(p => p.providerId === "google.com")?.email;
      if (gmail && isKeyEmail(cur.email)) {
        try { await A.updateEmail(cur, gmail); }
        catch { await A.verifyBeforeUpdateEmail(cur, gmail).catch(() => {}); }
      }
      await cur.reload();
    },
    async createAccessKey() {
      const u = currentUser();
      // Clave nueva: la anterior se quita (su correo ficticio deja de existir) y se vincula otra.
      if (hasKeyLink(u)) await A.unlink(u, "password");
      for (let tries = 0; ; tries++) {
        const key = newAccessKey();
        try {
          await A.linkWithCredential(u, A.EmailAuthProvider.credential(key.email, key.password));
          return key.display;
        } catch (e) {
          // Que dos claves compartan los 8 primeros caracteres es casi imposible, pero si pasa se prueba otra.
          if (codeOf(e) !== "auth/email-already-in-use" || tries >= 3) throw e;
        }
      }
    },
    async signInWithKey(input) {
      const key = parseAccessKey(input);
      if (!key) throw Object.assign(new Error("bad key"), { code: "key/format" });
      await A.signInWithEmailAndPassword(auth, key.email, key.password);
    },
    async sendEmailLink(email) {
      // Vuelve a la misma pantalla (p. ej. la votación del enlace). En la app, a la web pública, que la app abre.
      const base = native ? PUBLIC_ORIGIN : location.origin + location.pathname;
      try {
        await A.sendSignInLinkToEmail(auth, email, { url: `${base}?correo=1${location.hash}`, handleCodeInApp: true });
      } catch (e) {
        // operation-not-allowed aquí significa que falta activar el enlace por correo (no el acceso anónimo).
        if (codeOf(e) === "auth/operation-not-allowed") throw Object.assign(new Error("email link"), { code: "auth/email-link-disabled" });
        throw e;
      }
      try { localStorage.setItem(LINK_EMAIL, email); } catch { /* nada */ }
    },
    pendingLinkEmail() {
      try { return localStorage.getItem(LINK_EMAIL) || ""; } catch { return ""; }
    },
    isEmailLink: url => A.isSignInWithEmailLink(auth, url),
    async completeEmailLink(email, url) {
      const cur = auth.currentUser;
      const cred = A.EmailAuthProvider.credentialWithLink(email, url);
      let linked = false;
      if (cur && isKeyOnly(cur)) {
        // Cuenta sin registro abierta: se guarda en ese correo (mismo uid). La clave ya no hace falta y, como ocupa
        // el sitio del correo en la cuenta, se quita antes.
        const hadKey = hasKeyLink(cur);
        if (hadKey) await A.unlink(cur, "password");
        try {
          await A.linkWithCredential(cur, cred);
        } catch (e) {
          // Ese correo ya es de otra cuenta: esta sigue sin registro; si tenía clave, hay que darle una nueva.
          throw Object.assign(e as object, { keyRemoved: hadKey });
        }
        if (isKeyEmail(cur.email)) await A.updateEmail(cur, email).catch(() => {});
        await cur.reload();
        await cur.getIdToken(true); // que las reglas vean ya el correo
        linked = true;
      } else {
        await A.signInWithEmailLink(auth, email, url);
      }
      try { localStorage.removeItem(LINK_EMAIL); } catch { /* nada */ }
      return { linked };
    },
    async setDisplayName(name) {
      if (auth.currentUser) await A.updateProfile(auth.currentUser, { displayName: name });
    },
    async prepareDeleteAccount() {
      const u = currentUser();
      if (u.providerData.some(p => p.providerId === "google.com")) {
        if (native) await A.reauthenticateWithCredential(u, await googleCredential());
        else await A.reauthenticateWithPopup(u, provider);
        return "ok";
      }
      // Sin registro (anónima) no hay forma de volver a entrar: se intenta igual. El resto, si entró hace poco.
      const last = Date.parse(u.metadata.lastSignInTime || "") || 0;
      return u.isAnonymous || Date.now() - last < 4 * 60 * 1000 ? "ok" : "relogin";
    },
    async deleteAccount(uid) {
      const u = currentUser();
      if (u.uid !== uid) throw new Error("No hay ninguna sesión abierta.");
      // Sale de cada votación de su lista. Si una falla (p. ej. ya no existe o no hay acceso), se sigue con las demás.
      for (const entry of (await F.getDocs(libCol(uid))).docs) await leave(entry.id, uid).catch(() => {});
      // Sus datos: lista, grupos, dispositivos de avisos y perfil.
      for (const col of [libCol(uid), groupsCol(uid), tokensCol(uid)]) {
        const s = await F.getDocs(col);
        await commitIn(s.docs.map(d => d.ref), (b, r) => b.delete(r));
      }
      await F.deleteDoc(userRef(uid));
      // Y la cuenta de inicio de sesión. Si Firebase no lo deja (sesión antigua), al menos se cierra la sesión:
      // los datos ya no están.
      if (native) await (await nativeAuth()).signOut().catch(() => {});
      try { await u.delete(); } catch { await A.signOut(auth); }
    },

    // ---------- Votaciones ----------
    async createPoll(data, access) {
      // La votación y sus correos permitidos se guardan juntos (las reglas comprueban que es del mismo creador).
      const ref = F.doc(F.collection(db, "polls"));
      const batch = F.writeBatch(db);
      batch.set(ref, data);
      if (access) batch.set(accessRef(ref.id), access);
      await batch.commit();
      return ref.id;
    },
    async getAccess(id) {
      const s = await F.getDoc(accessRef(id));
      return s.exists() ? (s.data() as PollAccess) : null;
    },
    setAccess: (id, access) => F.setDoc(accessRef(id), access),
    async getPoll(id) { return withId(await F.getDoc(pollRef(id))); },
    updatePoll: (id, patch) => F.updateDoc(pollRef(id), patch),
    // La votación y, a la vez, su entrada en la colección del creador (y su grupo, si se queda vacío).
    deletePoll: (id, uid, dropGroupId) => removePoll(id, b => dropFromLibrary(b, uid, id, dropGroupId)),
    watchPoll: (id, cb, onErr) => F.onSnapshot(pollRef(id), s => cb(withId(s)), onErr),
    async leavePoll(id, uid, dropGroupId) {
      await leave(id, uid);
      const b = F.writeBatch(db);
      dropFromLibrary(b, uid, id, dropGroupId);
      await b.commit();
    },

    // ---------- Participantes y votos ----------
    // El nombre y la miniatura de cada participante van copiados en su voto: así abrir una votación no tiene que
    // leer el perfil de cada uno.
    watchVotes: (id, cb, onErr) => F.onSnapshot(votesCol(id), snap => cb(toMap<Vote>(snap)), onErr),
    watchVote: (id, uid, cb, onErr) => F.onSnapshot(F.doc(votesCol(id), uid),
      s => cb(s.exists() ? (s.data() as Vote) : null), onErr),
    async getVote(id, uid) {
      const s = await F.getDoc(F.doc(votesCol(id), uid));
      return s.exists() ? (s.data() as Vote) : null;
    },
    async joinPoll(id, user, opts = {}) {
      const ref = F.doc(votesCol(id), user.uid);
      const base: Vote = { name: user.name, photo: user.photo, seenAt: Date.now() };
      // Ya participaba: solo se actualizan nombre y foto (y, si había salido de la votación cerrada y vuelve, deja de
      // contar como ido).
      if (!opts.isNew) return F.setDoc(ref, { ...base, gone: F.deleteField() }, { merge: true });
      // Entrar por primera vez: con tope, el voto y el contador de la votación cambian juntos (lo exigen las reglas).
      const batch = F.writeBatch(db);
      batch.set(ref, opts.pending ? { ...base, status: "pending" } : base);
      if (opts.counted) batch.update(pollRef(id), { members: F.increment(1) });
      await batch.commit();
    },
    async setMemberStatus(id, uid, status, { from, counted }) {
      const batch = F.writeBatch(db);
      batch.update(F.doc(votesCol(id), uid), { status: status === "accepted" ? F.deleteField() : status });
      // Los rechazados no ocupan plaza: al rechazar se resta 1 y al readmitir se vuelve a sumar.
      const delta = (status === "rejected" ? -1 : 0) + (from === "rejected" ? 1 : 0);
      if (counted && delta) batch.update(pollRef(id), { members: F.increment(delta) });
      await batch.commit();
    },
    // Voto, voto del desempate y nombre/foto del participante: todo va en su documento, sin tocar el resto.
    saveVote: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),
    saveTiebreakVote: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),
    updateParticipant: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),

    // ---------- Chat ----------
    // Se piden los últimos por fecha descendente (que es lo que sabe limitar Firestore) y se les da la vuelta.
    watchChat: (id, cb, onErr) => F.onSnapshot(
      F.query(chatCol(id), F.orderBy("at", "desc"), F.limit(CHAT_LIMIT)),
      snap => {
        const out: ChatMessage[] = [];
        snap.forEach(d => out.push({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
        cb(out.reverse());
      }, onErr),
    async sendChat(id, msg) { await F.addDoc(chatCol(id), msg); },

    // ---------- Perfil ----------
    async getProfile(uid) {
      // Mismo reintento que ownSnapshot: justo al entrar, la primera lectura puede llegar antes que la sesión.
      for (let tries = 0; ; tries++) {
        try {
          const s = await F.getDoc(userRef(uid));
          return s.exists() ? (s.data() as Profile) : null;
        } catch (e) {
          if (codeOf(e) !== "permission-denied" || auth.currentUser?.uid !== uid || tries >= 2) throw e;
          await auth.currentUser?.getIdToken(true).catch(() => {});
          await new Promise(r => setTimeout(r, 400 * (tries + 1)));
        }
      }
    },
    saveProfile: (uid, data) => F.setDoc(userRef(uid), data, { merge: true }),

    // ---------- Avisos ----------
    savePushToken: (uid, token, data) => F.setDoc(F.doc(tokensCol(uid), token), data),
    removePushToken: (uid, token) => F.deleteDoc(F.doc(tokensCol(uid), token)),

    // ---------- Colección del usuario y grupos ----------
    watchLibrary(uid, cb, onErr) {
      let polls: Library["polls"] | null = null, groups: Library["groups"] | null = null;
      const emit = () => { if (polls && groups) cb({ polls, groups }); };
      const u1 = ownSnapshot(uid, libCol(uid), s => { polls = toMap<LibraryEntry>(s); emit(); }, onErr);
      const u2 = ownSnapshot(uid, groupsCol(uid), s => { groups = toMap<Group>(s); emit(); }, onErr);
      return () => { u1(); u2(); };
    },
    saveLibraryEntry: (uid, pollId, data) => F.setDoc(F.doc(libCol(uid), pollId), data, { merge: true }),
    async removeLibraryEntry(uid, pollId, dropGroupId) {
      const b = F.writeBatch(db);
      dropFromLibrary(b, uid, pollId, dropGroupId);
      await b.commit();
    },
    async createGroup(uid, name) {
      const ref = await F.addDoc(groupsCol(uid), { name, createdAt: Date.now() });
      return ref.id;
    },
    renameGroup: (uid, gid, name) => F.updateDoc(F.doc(groupsCol(uid), gid), { name }),
    async deleteGroup(uid, gid) {
      // Las votaciones del grupo no se borran: pasan a «Sin grupo».
      const snap = await F.getDocs(F.query(libCol(uid), F.where("groupId", "==", gid)));
      const batch = F.writeBatch(db);
      snap.forEach(d => batch.update(d.ref, { groupId: null }));
      batch.delete(F.doc(groupsCol(uid), gid));
      await batch.commit();
    },
  };
}
