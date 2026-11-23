// Almacén de demostración: la misma interfaz que el de Firebase (Store, en types.ts), pero con los datos en el
// localStorage de este navegador. Se usa con ?demo en la dirección (o si config.ts no tiene la configuración de
// Firebase). Hace las mismas comprobaciones que las reglas de Firestore, para que se comporte igual.
import { CHAT_LIMIT, MAX_CHAT, ghostName, hasLimit, isAdmin, keepsVotesOnLeave, pickHeir } from "../model";
import { slugify } from "../util";
import type { AuthUser, ChatMessage, Group, LibraryEntry, PollAccess, PollData, Profile, Store, Vote, Votes } from "../types";

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
  /** Votaciones privadas: con qué correo entró cada participante (pollId → uid → correo). */
  emails?: Record<string, Record<string, string>>;
  chat?: Record<string, Record<string, Omit<ChatMessage, "id">>>;
}

const KEY = "votaciones-demo-v2";      // los datos (localStorage: compartidos entre pestañas)
const UKEY = "votaciones-demo-user";   // la persona (sessionStorage: cada pestaña puede ser una distinta)

export function createDemoStore(): Store {
  // ---------- Datos ----------
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
  // Lo que escribe otra pestaña (otra persona de la demo) también se ve aquí.
  window.addEventListener("storage", e => { if (e.key === KEY) notify(); });
  /** Llama a `fn` ahora (en cuanto se pueda) y cada vez que cambien los datos, como una escucha de Firestore. */
  const watch = (fn: () => void) => {
    listeners.add(fn);
    setTimeout(fn, 0);
    return () => { listeners.delete(fn); };
  };
  const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
  const fail = (code: string) => Object.assign(new Error(code), { code });
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const lib = (db: DemoDb, uid: string) => (db.users[uid] ||= { polls: {}, groups: {} });

  // ---------- Sesión ----------
  let user: AuthUser | null = null;
  try { user = JSON.parse(sessionStorage.getItem(UKEY) || "null"); } catch { user = null; }
  const authListeners = new Set<(u: AuthUser | null) => void>();
  const setUser = (u: AuthUser | null) => {
    user = u;
    try { u ? sessionStorage.setItem(UKEY, JSON.stringify(u)) : sessionStorage.removeItem(UKEY); } catch { /* nada */ }
    authListeners.forEach(f => f(user));
  };
  const slug = (s: string) => slugify(s, 100) || "anon";
  // Sesiones demo guardadas antes de existir el correo.
  if (user && !user.email) user = { ...user, email: slug(user.name) + "@demo.test" };
  if (user) user = { ...user, anon: false, hasName: true };
  const me = () => user?.uid || "";

  /** Deja una votación: lo mismo que `leave` en firebase.ts. */
  function leave(db: DemoDb, id: string, uid: string) {
    const p = db.polls[id];
    if (!p) return;
    const ghost = ghostName();
    for (const m of Object.values(db.chat?.[id] || {})) if (m.uid === uid) m.name = ghost;
    if (db.emails?.[id]) delete db.emails[id][uid];
    if (p.ownerUid === uid) {
      const votes = db.votes[id] || {};
      const heir = pickHeir(votes, uid, p.admins);
      if (!heir) { delete db.polls[id]; delete db.votes[id]; return; }
      Object.assign(p, {
        ownerUid: heir, ownerName: votes[heir]?.name || "Alguien", admins: (p.admins || []).filter(a => a !== heir),
        ...(p.founder ? {} : { founder: uid, founderName: ghost }),
      });
    } else if (p.admins?.includes(uid)) {
      p.admins = p.admins.filter(a => a !== uid);
    }
    const v = db.votes[id]?.[uid];
    if (!v) return;
    const sad = { name: ghost, photo: "", gone: true };
    if (v.status === "rejected") { Object.assign(v, sad); return; }
    if (v.status === "pending" || !keepsVotesOnLeave(p)) {
      delete db.votes[id][uid];
      if (hasLimit(p)) p.members = Math.max(0, (p.members || 0) - 1);
    } else {
      Object.assign(v, sad);
    }
  }

  return {
    mode: "demo",

    // ---------- Sesión y cuenta ----------
    onAuth(cb) {
      authListeners.add(cb);
      setTimeout(() => cb(user), 0);
      return () => { authListeners.delete(cb); };
    },
    async signIn(opts) {
      const name = opts?.name || "Alguien";
      // En el modo demo el correo de cada persona es "<nombre>@demo.test" (para probar las votaciones privadas).
      setUser({ uid: "demo-" + slug(name), name, photo: "", email: slug(name) + "@demo.test", anon: false, hasName: true });
    },
    async signOut() { setUser(null); },
    // El modo demo no tiene cuentas: su entrada con un nombre ya es la sesión completa.
    async linkGoogle() { throw fail("unavailable"); },
    async createAccessKey() { throw fail("unavailable"); },
    async signInWithKey() { throw fail("unavailable"); },
    async sendEmailLink() { throw fail("unavailable"); },
    pendingLinkEmail: () => "",
    isEmailLink: () => false,
    async completeEmailLink() { throw fail("unavailable"); },
    async setDisplayName() { /* el nombre del modo demo ya va en la sesión */ },
    async prepareDeleteAccount() { return "ok"; },
    async deleteAccount(uid) {
      const db = load();
      for (const id of Object.keys(db.users[uid]?.polls || {})) leave(db, id, uid);
      delete db.users[uid];
      write(db);
      setUser(null);
    },

    // ---------- Votaciones ----------
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
      if (!db.polls[id] || !isAdmin(db.polls[id], me())) throw fail("permission-denied");
      const a = db.access?.[id];
      return a ? clone(a) : null;
    },
    async setAccess(id, access) {
      const db = load();
      if (!db.polls[id] || !isAdmin(db.polls[id], me())) throw fail("permission-denied");
      (db.access ||= {})[id] = clone(access);
      write(db);
    },
    // Como las reglas: cada uno apunta solo el suyo, solo en las privadas, y solo lo leen quienes la administran.
    async saveMemberEmail(id, uid, email) {
      const db = load();
      const p = db.polls[id];
      if (!p) throw fail("not-found");
      if (uid !== me() || !p.emailsOnly || email !== (user?.email || "")) throw fail("permission-denied");
      ((db.emails ||= {})[id] ||= {})[uid] = email;
      write(db);
    },
    async getMemberEmails(id) {
      const db = load();
      const p = db.polls[id];
      if (!p) throw fail("not-found");
      if (!isAdmin(p, me())) throw fail("permission-denied");
      return clone(db.emails?.[id] || {});
    },
    async getPoll(id) { const p = load().polls[id]; return p ? { id, ...clone(p) } : null; },
    async updatePoll(id, patch) {
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      // Como las reglas: el máximo no puede quedar por debajo de las plazas ocupadas.
      const next = { ...db.polls[id], ...patch };
      if ("maxPeople" in patch && typeof next.maxPeople === "number" && (next.members || 0) > next.maxPeople) throw fail("permission-denied");
      Object.assign(db.polls[id], patch);
      write(db);
    },
    async deletePoll(id, uid, dropGroupId) {
      const db = load();
      delete db.polls[id];
      delete db.votes[id];
      if (db.access) delete db.access[id];
      if (db.emails) delete db.emails[id];
      delete lib(db, uid).polls[id];
      if (dropGroupId) delete lib(db, uid).groups[dropGroupId];
      write(db);
    },
    watchPoll: (id, cb) => watch(() => { const p = load().polls[id]; cb(p ? { id, ...clone(p) } : null); }),
    async leavePoll(id, uid, dropGroupId) {
      const db = load();
      leave(db, id, uid);
      delete lib(db, uid).polls[id];
      if (dropGroupId) delete lib(db, uid).groups[dropGroupId];
      write(db);
    },

    // ---------- Participantes y votos ----------
    watchVotes: (id, cb) => watch(() => cb(clone(load().votes[id] || {}))),
    watchVote: (id, uid, cb) => watch(() => { const v = load().votes[id]?.[uid]; cb(v ? clone(v) : null); }),
    async getVote(id, uid) { const v = load().votes[id]?.[uid]; return v ? clone(v) : null; },
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
        if (hasLimit(p)) {
          if ((p.members || 0) >= (p.maxPeople as number)) throw fail("permission-denied");
          p.members = (p.members || 0) + 1;
        }
        const first: Vote = { ...base, joinedAt: base.seenAt };
        votes[u.uid] = opts.pending ? { ...first, status: "pending" } : first;
      } else {
        // Ya participaba: como en Firestore, si había salido de la votación cerrada y vuelve, deja de contar como ido.
        const { gone: _gone, ...prev } = votes[u.uid] || {};
        votes[u.uid] = { ...prev, ...base };
      }
      write(db);
    },
    async setMemberStatus(id, uid, status, { from, counted, removed, dropAdmin }) {
      const db = load();
      const p = db.polls[id];
      const v = db.votes[id]?.[uid];
      if (!p || !v) throw fail("not-found");
      if (!isAdmin(p, me()) || uid === p.ownerUid || uid === me()) throw fail("permission-denied");
      // A un administrador solo le cambia el estado (le expulsa) el creador, como en las reglas.
      if (p.admins?.includes(uid) && p.ownerUid !== me()) throw fail("permission-denied");
      // Como en Firestore: al expulsar (o al readmitir a quien estaba rechazado) se borran sus votos.
      if (status === "accepted") {
        if (from === "rejected") { delete v.picks; delete v.tb; }
        delete v.status; delete v.removed; v.joinedAt = Date.now();
      } else {
        v.status = status;
        if (status === "rejected" && removed) { v.removed = true; delete v.picks; delete v.tb; }
      }
      const delta = (status === "rejected" ? -1 : 0) + (from === "rejected" ? 1 : 0);
      if (counted && delta) p.members = (p.members || 0) + delta;
      if (dropAdmin) p.admins = (p.admins || []).filter(a => a !== uid);
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

    // ---------- Chat ----------
    watchChat: (id, since, cb) => watch(() => {
      const all = load().chat?.[id] || {};
      const msgs = Object.entries(all).map(([mid, m]) => ({ id: mid, ...clone(m) })).filter(m => m.at >= since);
      cb(msgs.sort((a, b) => a.at - b.at).slice(-CHAT_LIMIT));
    }),
    async sendChat(id, msg) {
      // Las mismas comprobaciones que hacen las reglas de Firestore.
      const db = load();
      if (!db.polls[id]) throw fail("not-found");
      if (msg.uid !== user?.uid) throw fail("permission-denied");
      if (db.votes[id]?.[msg.uid]?.status) throw fail("permission-denied"); // pendiente o rechazado: no escribe
      if (db.polls[id].ownerUid !== msg.uid && !db.votes[id]?.[msg.uid]) throw fail("permission-denied");
      // Los avisos de cambios solo los escribe quien administra la votación.
      if (msg.sys && !isAdmin(db.polls[id], msg.uid)) throw fail("permission-denied");
      const text = msg.text.trim();
      if (!text || text.length > MAX_CHAT) throw fail("invalid-argument");
      ((db.chat ||= {})[id] ||= {})[rid()] = { ...clone(msg), text };
      write(db);
    },

    // ---------- Perfil ----------
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

    // ---------- Avisos ----------
    // El modo demo no tiene servidor que mande avisos: la pantalla de perfil ni los ofrece.
    async savePushToken() { throw fail("unavailable"); },
    async removePushToken() { /* nada */ },

    // ---------- Colección del usuario y grupos ----------
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
