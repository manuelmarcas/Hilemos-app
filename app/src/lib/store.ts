// Capa de datos. Dos implementaciones con la misma interfaz (Store, en types.ts):
//  - Firebase (Google Auth + Firestore), la de verdad.
//  - Demo (localStorage), para probar sin Firebase: añade ?demo a la URL.
//
// Colecciones:
//   polls/{pollId}                     la votación (ver model.ts)
//   polls/{pollId}/votes/{uid}         participante: { name, photo, picks?, seenAt, updatedAt, status? }
//   polls/{pollId}/chat/{msgId}        mensaje del chat: { uid, name, text, at }
//   polls/{pollId}/private/access      correos permitidos (solo el creador): { emails }
//   users/{uid}/polls/{pollId}         colección del usuario: { title, type, role, ownerName, groupId, addedAt, archived }
//   users/{uid}/groups/{groupId}       grupos del usuario: { name, createdAt }
//   users/{uid}                        perfil: { name, photo, updatedAt }

import type { FirebaseOptions } from "firebase/app";
import type { QuerySnapshot, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { CHAT_LIMIT, MAX_CHAT } from "./model";
import { isNative } from "./native";
import type { AuthUser, ChatMessage, Group, Library, LibraryEntry, Poll, PollAccess, PollData, Profile, Store, Vote, Votes } from "./types";

export async function createFirebaseStore(config: FirebaseOptions): Promise<Store> {
  // Firebase se carga aparte: el modo demo no lo descarga.
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
  // Caché local (IndexedDB): al volver a escuchar una votación o la colección, Firestore solo cobra los
  // documentos que han cambiado (si han pasado menos de 30 min). También abre más rápido y funciona sin conexión.
  // Si el navegador no la permite (p. ej. modo privado), Firestore sigue funcionando solo en memoria.
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
  });
  const provider = new A.GoogleAuthProvider();
  const nativeAuth = async () => (await import("@capacitor-firebase/authentication")).FirebaseAuthentication;
  // Elige la cuenta de Google del móvil y devuelve la credencial para el SDK web.
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

  // Nombre elegido al entrar sin cuenta: el perfil se guarda en cuanto hay sesión, pero la sesión
  // se anuncia antes de que la escritura termine, así que de momento el nombre sale de aquí.
  let anonName = "";
  const toUser = (u: import("firebase/auth").User | null): AuthUser | null =>
    u && {
      uid: u.uid,
      name: u.displayName || (u.isAnonymous && anonName) || "Alguien",
      photo: u.photoURL || "",
      email: (u.email || "").toLowerCase(),
      anon: u.isAnonymous,
    };
  const pollRef = (id: string) => F.doc(db, "polls", id);
  const votesCol = (id: string) => F.collection(db, "polls", id, "votes");
  const chatCol = (id: string) => F.collection(db, "polls", id, "chat");
  const accessRef = (id: string) => F.doc(db, "polls", id, "private", "access");
  const libCol = (uid: string) => F.collection(db, "users", uid, "polls");
  const groupsCol = (uid: string) => F.collection(db, "users", uid, "groups");
  const withId = (s: DocumentSnapshot<DocumentData>): Poll | null =>
    (s.exists() ? ({ id: s.id, ...s.data() } as Poll) : null);
  const toMap = <T,>(snap: QuerySnapshot<DocumentData>) => {
    const o: Record<string, T> = {};
    snap.forEach(d => { o[d.id] = d.data() as T; });
    return o;
  };

  return {
    mode: "firebase",
    onAuth: cb => A.onAuthStateChanged(auth, u => cb(toUser(u))),
    async signIn(opts) {
      if (!opts?.anonymous) return native ? A.signInWithCredential(auth, await googleCredential()) : A.signInWithPopup(auth, provider);
      const name = (opts.name || "").trim() || "Alguien";
      anonName = name;
      const cred = await A.signInAnonymously(auth);
      // El nombre va en la sesión y, para que aguante una recarga, también en el perfil (si falla, no importa:
      // la sesión ya lo lleva).
      await A.updateProfile(cred.user, { displayName: name });
      F.setDoc(F.doc(db, "users", cred.user.uid), { name, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    },
    async linkGoogle() {
      const u = auth.currentUser;
      if (!u) throw new Error("No hay ninguna sesión abierta.");
      if (native) await A.linkWithCredential(u, await googleCredential());
      else await A.linkWithPopup(u, provider);
      await u.reload();
    },
    async signOut() {
      // En la app también se cierra la cuenta de Google del selector, para poder elegir otra la próxima vez.
      if (native) await (await nativeAuth()).signOut().catch(() => {});
      await A.signOut(auth);
    },

    // ----- Votaciones -----
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
    async deletePoll(id, uid, dropGroupId) {
      // Primero los votos, en lotes (las reglas consultan la votación para permitirlo, así que aún debe existir),
      // y luego la votación y su entrada en la colección del creador, juntas.
      const snap = await F.getDocs(votesCol(id));
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = F.writeBatch(db);
        snap.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      const batch = F.writeBatch(db);
      batch.delete(accessRef(id));
      batch.delete(pollRef(id));
      batch.delete(F.doc(libCol(uid), id));
      if (dropGroupId) batch.delete(F.doc(groupsCol(uid), dropGroupId));
      await batch.commit();
    },
    watchPoll: (id, cb, onErr) => F.onSnapshot(pollRef(id), s => cb(withId(s)), onErr),

    // ----- Participantes y votos -----
    watchVotes: (id, cb, onErr) => F.onSnapshot(votesCol(id), snap => cb(toMap<Vote>(snap)), onErr),
    // Registra al usuario como participante sin tocar sus votos (nombre y miniatura copiados en el voto:
    // así abrir una votación no tiene que leer el perfil de cada participante).
    watchVote: (id, uid, cb, onErr) => F.onSnapshot(F.doc(votesCol(id), uid),
      s => cb(s.exists() ? (s.data() as Vote) : null), onErr),
    async joinPoll(id, user, opts = {}) {
      const ref = F.doc(votesCol(id), user.uid);
      const base: Vote = { name: user.name, photo: user.photo, seenAt: Date.now() };
      if (!opts.isNew) return F.setDoc(ref, base, { merge: true });
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
    saveVote: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),
    // Voto del desempate (la votación principal está cerrada, pero el desempate no).
    saveTiebreakVote: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),
    // Actualiza nombre/foto del participante sin tocar sus votos (permitido aunque esté cerrada).
    updateParticipant: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),

    // ----- Chat -----
    // Se piden los últimos por fecha descendente (que es lo que sabe limitar Firestore) y se le dan la vuelta.
    watchChat: (id, cb, onErr) => F.onSnapshot(
      F.query(chatCol(id), F.orderBy("at", "desc"), F.limit(CHAT_LIMIT)),
      snap => {
        const out: ChatMessage[] = [];
        snap.forEach(d => out.push({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
        cb(out.reverse());
      }, onErr),
    async sendChat(id, msg) { await F.addDoc(chatCol(id), msg); },

    // ----- Perfil -----
    async getProfile(uid) {
      const s = await F.getDoc(F.doc(db, "users", uid));
      return s.exists() ? (s.data() as Profile) : null;
    },
    saveProfile: (uid, data) => F.setDoc(F.doc(db, "users", uid), data, { merge: true }),

    // ----- Avisos -----
    savePushToken: (uid, token, data) => F.setDoc(F.doc(db, "users", uid, "tokens", token), data),
    removePushToken: (uid, token) => F.deleteDoc(F.doc(db, "users", uid, "tokens", token)),

    // ----- Colección del usuario y grupos -----
    watchLibrary(uid, cb, onErr) {
      let polls: Library["polls"] | null = null, groups: Library["groups"] | null = null;
      const emit = () => { if (polls && groups) cb({ polls, groups }); };
      const u1 = F.onSnapshot(libCol(uid), s => { polls = toMap<LibraryEntry>(s); emit(); }, onErr);
      const u2 = F.onSnapshot(groupsCol(uid), s => { groups = toMap<Group>(s); emit(); }, onErr);
      return () => { u1(); u2(); };
    },
    saveLibraryEntry: (uid, pollId, data) => F.setDoc(F.doc(libCol(uid), pollId), data, { merge: true }),
    async removeLibraryEntry(uid, pollId, dropGroupId) {
      const batch = F.writeBatch(db);
      batch.delete(F.doc(libCol(uid), pollId));
      if (dropGroupId) batch.delete(F.doc(groupsCol(uid), dropGroupId));
      await batch.commit();
    },
    restoreGroup: (uid, gid, data) => F.setDoc(F.doc(groupsCol(uid), gid), data),
    async createGroup(uid, name) {
      const ref = await F.addDoc(groupsCol(uid), { name, createdAt: Date.now() });
      return ref.id;
    },
    renameGroup: (uid, gid, name) => F.updateDoc(F.doc(groupsCol(uid), gid), { name }),
    async deleteGroup(uid, gid) {
      // Las votaciones del grupo no se borran: pasan a "Sin grupo".
      const snap = await F.getDocs(F.query(libCol(uid), F.where("groupId", "==", gid)));
      const batch = F.writeBatch(db);
      snap.forEach(d => batch.update(d.ref, { groupId: null }));
      batch.delete(F.doc(groupsCol(uid), gid));
      await batch.commit();
    },
  };
}

interface DemoUserData {
  polls: Record<string, LibraryEntry>;
  groups: Record<string, Group>;
  profile?: Profile;
}
interface DemoDb {
  polls: Record<string, PollData>;
  votes: Record<string, Votes>;
  users: Record<string, DemoUserData>;
  access?: Record<string, PollAccess>;
  chat?: Record<string, Record<string, Omit<ChatMessage, "id">>>;
}

export function createDemoStore(): Store {
  const KEY = "votaciones-demo-v2";
  const UKEY = "votaciones-demo-user";
  const empty = (): DemoDb => ({ polls: {}, votes: {}, users: {} });
  const read = (): DemoDb => {
    try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return empty(); }
  };
  let memory: DemoDb | null = null; // por si localStorage no está disponible
  const load = () => memory || read();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(f => f());
  const write = (db: DemoDb) => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); memory = null; } catch { memory = db; }
    notify();
  };
  window.addEventListener("storage", e => { if (e.key === KEY) notify(); });
  const watch = (fn: () => void) => {
    listeners.add(fn);
    setTimeout(fn, 0);
    return () => { listeners.delete(fn); };
  };
  const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
  const fail = (code: string) => Object.assign(new Error(code), { code });
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const lib = (db: DemoDb, uid: string) => (db.users[uid] ||= { polls: {}, groups: {} });

  // El usuario demo vive en sessionStorage: cada pestaña puede ser una persona distinta.
  let user: AuthUser | null = null;
  try { user = JSON.parse(sessionStorage.getItem(UKEY) || "null"); } catch { user = null; }
  const authListeners = new Set<(u: AuthUser | null) => void>();
  const setUser = (u: AuthUser | null) => {
    user = u;
    try { u ? sessionStorage.setItem(UKEY, JSON.stringify(u)) : sessionStorage.removeItem(UKEY); } catch { /* nada */ }
    authListeners.forEach(f => f(user));
  };
  const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "anon";
  // Sesiones demo guardadas antes de existir el correo.
  if (user && !user.email) user = { ...user, email: slug(user.name) + "@demo.test" };
  if (user) user = { ...user, anon: false };

  return {
    mode: "demo",
    onAuth(cb) {
      authListeners.add(cb);
      setTimeout(() => cb(user), 0);
      return () => { authListeners.delete(cb); };
    },
    async signIn(opts) {
      const name = opts?.name || "Alguien";
      // En el modo demo el correo de cada persona es "<nombre>@demo.test" (para probar las votaciones privadas).
      setUser({ uid: "demo-" + slug(name), name, photo: "", email: slug(name) + "@demo.test", anon: false });
    },
    // El modo demo no tiene cuentas: su entrada con un nombre ya es la sesión completa.
    async linkGoogle() { throw fail("unavailable"); },
    async signOut() { setUser(null); },

    async createPoll(data, access) {
      const db = load();
      const id = rid();
      db.polls[id] = clone(data);
      if (access) (db.access ||= {})[id] = clone(access);
      write(db);
      return id;
    },
    async getAccess(id) {
      const db = load();
      if (db.polls[id]?.ownerUid !== user?.uid) throw fail("permission-denied");
      const a = db.access?.[id];
      return a ? clone(a) : null;
    },
    async setAccess(id, access) {
      const db = load();
      if (db.polls[id]?.ownerUid !== user?.uid) throw fail("permission-denied");
      (db.access ||= {})[id] = clone(access);
      write(db);
    },
    async getPoll(id) { const p = load().polls[id]; return p ? { id, ...clone(p) } : null; },
    async updatePoll(id, patch) {
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      Object.assign(db.polls[id], patch);
      write(db);
    },
    async deletePoll(id, uid, dropGroupId) {
      const db = load();
      delete db.polls[id];
      delete db.votes[id];
      if (db.access) delete db.access[id];
      delete lib(db, uid).polls[id];
      if (dropGroupId) delete lib(db, uid).groups[dropGroupId];
      write(db);
    },
    watchPoll: (id, cb) => watch(() => { const p = load().polls[id]; cb(p ? { id, ...clone(p) } : null); }),

    watchVotes: (id, cb) => watch(() => cb(clone(load().votes[id] || {}))),
    watchVote: (id, uid, cb) => watch(() => { const v = load().votes[id]?.[uid]; cb(v ? clone(v) : null); }),
    async joinPoll(id, u, opts = {}) {
      // Las mismas comprobaciones que hacen las reglas de Firestore.
      const db = load();
      const p = db.polls[id];
      if (!p) throw fail("not-found");
      const votes = (db.votes[id] ||= {});
      const base: Vote = { name: u.name, photo: u.photo, seenAt: Date.now() };
      if (opts.isNew && !votes[u.uid]) {
        const owner = p.ownerUid === u.uid;
        if (p.emailsOnly && !owner && !(db.access?.[id]?.emails || []).includes(user?.email || "")) throw fail("permission-denied");
        if (p.approval && !owner && !opts.pending) throw fail("permission-denied");
        if (typeof p.maxPeople === "number") {
          if ((p.members || 0) >= p.maxPeople) throw fail("permission-denied");
          p.members = (p.members || 0) + 1;
        }
        votes[u.uid] = opts.pending ? { ...base, status: "pending" } : base;
      } else {
        votes[u.uid] = { ...(votes[u.uid] || {}), ...base };
      }
      write(db);
    },
    async setMemberStatus(id, uid, status, { from, counted }) {
      const db = load();
      const p = db.polls[id];
      const v = db.votes[id]?.[uid];
      if (!p || !v) throw fail("not-found");
      if (p.ownerUid !== user?.uid) throw fail("permission-denied");
      if (status === "accepted") delete v.status; else v.status = status;
      const delta = (status === "rejected" ? -1 : 0) + (from === "rejected" ? 1 : 0);
      if (counted && delta) p.members = (p.members || 0) + delta;
      write(db);
    },
    async saveVote(id, uid, data) {
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      if (db.polls[id].closed) throw fail("permission-denied");
      const votes = (db.votes[id] ||= {});
      if (votes[uid]?.status) throw fail("permission-denied"); // pendiente o rechazado: no puede votar
      votes[uid] = { ...(votes[uid] || {}), ...clone(data) };
      write(db);
    },

    async saveTiebreakVote(id, uid, data) {
      const db = load();
      const p = db.polls[id];
      if (!p) throw fail("not-found");
      const tb = p.tiebreak;
      if (!tb || tb.done || (data.tb && (data.tb.id !== tb.id || !tb.candidates.includes(data.tb.pick)))) throw fail("permission-denied");
      const votes = (db.votes[id] ||= {});
      votes[uid] = { ...(votes[uid] || {}), ...clone(data) };
      write(db);
    },
    async updateParticipant(id, uid, data) {
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      const votes = (db.votes[id] ||= {});
      votes[uid] = { ...(votes[uid] || {}), ...clone(data) };
      write(db);
    },

    watchChat: (id, cb) => watch(() => {
      const all = load().chat?.[id] || {};
      const msgs = Object.entries(all).map(([mid, m]) => ({ id: mid, ...clone(m) }));
      cb(msgs.sort((a, b) => a.at - b.at).slice(-CHAT_LIMIT));
    }),
    async sendChat(id, msg) {
      // Las mismas comprobaciones que hacen las reglas de Firestore.
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      if (msg.uid !== user?.uid) throw fail("permission-denied");
      if (db.votes[id]?.[msg.uid]?.status) throw fail("permission-denied"); // pendiente o rechazado: no escribe
      if (db.polls[id].ownerUid !== msg.uid && !db.votes[id]?.[msg.uid]) throw fail("permission-denied");
      const text = msg.text.trim();
      if (!text || text.length > MAX_CHAT) throw fail("invalid-argument");
      ((db.chat ||= {})[id] ||= {})[rid()] = { ...clone(msg), text };
      write(db);
    },

    async getProfile(uid) {
      const p = load().users[uid]?.profile;
      return p ? clone(p) : null;
    },
    async saveProfile(uid, data) {
      const db = load();
      const l = lib(db, uid);
      l.profile = { ...(l.profile || {}), ...clone(data) };
      write(db);
    },

    // El modo demo no tiene servidor que mande avisos: la pantalla de perfil ni los ofrece.
    async savePushToken() { throw fail("unavailable"); },
    async removePushToken() { /* nada */ },

    watchLibrary: (uid, cb) => watch(() => {
      const l = load().users[uid] || { polls: {}, groups: {} };
      cb(clone({ polls: l.polls || {}, groups: l.groups || {} }));
    }),
    async saveLibraryEntry(uid, pollId, data) {
      const db = load();
      const l = lib(db, uid);
      l.polls[pollId] = { ...(l.polls[pollId] || {}), ...clone(data) };
      write(db);
    },
    async removeLibraryEntry(uid, pollId, dropGroupId) {
      const db = load();
      delete lib(db, uid).polls[pollId];
      if (dropGroupId) delete lib(db, uid).groups[dropGroupId];
      write(db);
    },
    async restoreGroup(uid, gid, data) {
      const db = load();
      lib(db, uid).groups[gid] = clone(data);
      write(db);
    },
    async createGroup(uid, name) {
      const db = load();
      const id = rid();
      lib(db, uid).groups[id] = { name, createdAt: Date.now() };
      write(db);
      return id;
    },
    async renameGroup(uid, gid, name) {
      const db = load();
      const g = lib(db, uid).groups[gid];
      if (!g) throw fail("not-found");
      g.name = name;
      write(db);
    },
    async deleteGroup(uid, gid) {
      const db = load();
      const l = lib(db, uid);
      Object.values(l.polls).forEach(p => { if (p.groupId === gid) p.groupId = null; });
      delete l.groups[gid];
      write(db);
    },
  };
}
