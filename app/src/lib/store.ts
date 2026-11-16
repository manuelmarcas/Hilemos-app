// Capa de datos. Dos implementaciones con la misma interfaz (Store, en types.ts):
//  - Firebase (Google Auth + Firestore), la de verdad.
//  - Demo (localStorage), para probar sin Firebase: añade ?demo a la URL.
//
// Colecciones:
//   polls/{pollId}                     la votación (ver model.ts)
//   polls/{pollId}/votes/{uid}         participante: { name, photo, picks?, seenAt, updatedAt }
//   users/{uid}/polls/{pollId}         colección del usuario: { title, type, role, ownerName, groupId, addedAt, archived }
//   users/{uid}/groups/{groupId}       grupos del usuario: { name, createdAt }
//   users/{uid}                        perfil: { name, photo, updatedAt }

import type { FirebaseOptions } from "firebase/app";
import type { QuerySnapshot, DocumentSnapshot, DocumentData } from "firebase/firestore";
import type { AuthUser, Group, Library, LibraryEntry, Poll, PollData, Profile, Store, Vote, Votes } from "./types";

export async function createFirebaseStore(config: FirebaseOptions): Promise<Store> {
  // Firebase se carga aparte: el modo demo no lo descarga.
  const [{ initializeApp }, A, F] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(config);
  const auth = A.getAuth(app);
  // Caché local (IndexedDB): al volver a escuchar una votación o la colección, Firestore solo cobra los
  // documentos que han cambiado (si han pasado menos de 30 min). También abre más rápido y funciona sin conexión.
  // Si el navegador no la permite (p. ej. modo privado), Firestore sigue funcionando solo en memoria.
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
  });
  const provider = new A.GoogleAuthProvider();

  const toUser = (u: import("firebase/auth").User | null): AuthUser | null =>
    u && { uid: u.uid, name: u.displayName || "Alguien", photo: u.photoURL || "" };
  const pollRef = (id: string) => F.doc(db, "polls", id);
  const votesCol = (id: string) => F.collection(db, "polls", id, "votes");
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
    signIn: () => A.signInWithPopup(auth, provider),
    signOut: () => A.signOut(auth),

    // ----- Votaciones -----
    async createPoll(data) {
      const ref = await F.addDoc(F.collection(db, "polls"), data);
      return ref.id;
    },
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
    joinPoll: (id, user) => F.setDoc(F.doc(votesCol(id), user.uid),
      { name: user.name, photo: user.photo, seenAt: Date.now() }, { merge: true }),
    saveVote: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),
    // Voto del desempate (la votación principal está cerrada, pero el desempate no).
    saveTiebreakVote: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),
    // Actualiza nombre/foto del participante sin tocar sus votos (permitido aunque esté cerrada).
    updateParticipant: (id, uid, data) => F.setDoc(F.doc(votesCol(id), uid), data, { merge: true }),

    // ----- Perfil -----
    async getProfile(uid) {
      const s = await F.getDoc(F.doc(db, "users", uid));
      return s.exists() ? (s.data() as Profile) : null;
    },
    saveProfile: (uid, data) => F.setDoc(F.doc(db, "users", uid), data, { merge: true }),

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

  return {
    mode: "demo",
    onAuth(cb) {
      authListeners.add(cb);
      setTimeout(() => cb(user), 0);
      return () => { authListeners.delete(cb); };
    },
    async signIn(opts) {
      const name = opts?.name || "Alguien";
      setUser({ uid: "demo-" + slug(name), name, photo: "" });
    },
    async signOut() { setUser(null); },

    async createPoll(data) {
      const db = load();
      const id = rid();
      db.polls[id] = clone(data);
      write(db);
      return id;
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
      delete lib(db, uid).polls[id];
      if (dropGroupId) delete lib(db, uid).groups[dropGroupId];
      write(db);
    },
    watchPoll: (id, cb) => watch(() => { const p = load().polls[id]; cb(p ? { id, ...clone(p) } : null); }),

    watchVotes: (id, cb) => watch(() => cb(clone(load().votes[id] || {}))),
    async joinPoll(id, u) {
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      const votes = (db.votes[id] ||= {});
      votes[u.uid] = { ...(votes[u.uid] || {}), name: u.name, photo: u.photo, seenAt: Date.now() };
      write(db);
    },
    async saveVote(id, uid, data) {
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      if (db.polls[id].closed) throw fail("permission-denied");
      const votes = (db.votes[id] ||= {});
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
