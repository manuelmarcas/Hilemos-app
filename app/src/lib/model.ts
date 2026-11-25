// Modelo de una votación y cálculo de recuentos.
//
// Documento `polls/{id}`: ver types.ts (PollData).
// Voto `polls/{id}/votes/{uid}`: { name, photo, picks: ["<slot>|<opción>", ...], tb: { id, pick } }

import * as D from "./dates";
import type { AutoCloseReason, ChatReport, LibraryEntry, MemberStatus, MyPollData, PersonReport, Poll, PollData, PollOption, PollType, ReportReason, Vote, Votes } from "./types";
import type { IconName } from "../components/Icon";

export interface TypeInfo {
  id: PollType;
  /** Icono de la interfaz. */
  icon: IconName;
  /** Emoji equivalente, para la imagen de resultados (canvas). */
  emoji: string;
  name: string;
  unit: [string, string];
  desc: string;
}

export const TYPES: TypeInfo[] = [
  { id: "hours", icon: "hours", emoji: "⏰", name: "Horas", unit: ["franja", "franjas"], desc: "Franjas horarias u horas sueltas de uno o varios días" },
  { id: "days", icon: "days", emoji: "📅", name: "Días", unit: ["día", "días"], desc: "Días concretos, con hasta 4 opciones por día" },
  { id: "weeks", icon: "weeks", emoji: "🗓️", name: "Semanas", unit: ["semana", "semanas"], desc: "Semanas completas, de lunes a domingo" },
  { id: "months", icon: "months", emoji: "📆", name: "Meses", unit: ["mes", "meses"], desc: "Meses completos" },
  { id: "options", icon: "options", emoji: "🗳️", name: "Opciones", unit: ["opción", "opciones"], desc: "Una lista libre, sin fechas: restaurante, regalo, destino…" },
];
export const TYPE = Object.fromEntries(TYPES.map(t => [t.id, t])) as Record<PollType, TypeInfo>;

export const MAX_OPTIONS = 4;
/** Opciones de una votación de opciones libres: como poco 2 y como mucho MAX_CHOICES. */
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 30;
/** Icono de una opción libre a la que no se le ha elegido ninguno: neutro, para que no sugiera nada. */
export const DEFAULT_CHOICE_ICON = "⚪";
export const TOP_N = 5; // opciones que se muestran en "más votadas"

// ----- Quién puede unirse -----
/** Tope de personas por votación (para que no se colapse), contando al creador. */
export const MAX_PEOPLE = 150;
/** Personas por votación en el plan gratuito (3.3): más será premium. De momento solo se marca, no se limita. */
export const FREE_PEOPLE = 20;
/** Votaciones abiertas a la vez que gestiona alguien sin premium (3.1, §9). De momento solo se marca. */
export const FREE_OPEN = 3;

/**
 * La votación usa algo premium (§8, «Reutilizar una votación con funciones de pago»): plazo, aprobación, solo correos,
 * administradores o más de FREE_PEOPLE personas. Reabrirla será premium. Las personas se cuentan por las que hay
 * (`members`), no por el máximo: durante el lanzamiento el máximo por defecto es MAX_PEOPLE en todas.
 */
export function hasPremiumSettings(p: PollData) {
  return !!p.deadline || !!p.approval || !!p.emailsOnly || !!p.admins?.length || (p.members || 0) > FREE_PEOPLE;
}

/** Votaciones abiertas que gestiona `uid` (las que creó o heredó), para el límite FREE_OPEN (§9). */
export function openManaged(polls: (PollData | null | undefined)[], uid: string) {
  return polls.filter(p => p && p.ownerUid === uid && !p.closed && !deadlinePassed(p)).length;
}

/** Campos de la votación que solo escribe el servidor (functions/plan.js): las reglas no dejan crearlos ni cambiarlos. */
export const SERVER_KEYS = ["ownerSince", "autoCloseAt", "autoCloseWhy", "autoCloseWarned", "autoClosedAt", "chatAt"] as const;

/**
 * La cuenta atrás que cerrará sola la votación, si sigue abierta: cuándo y por qué (el primer motivo que llega). La
 * pone el servidor cuando quien la gestiona no tiene premium y le sobra o usa funciones de pago (§8). Si el plazo
 * llega antes, no cuenta: la cierra el plazo.
 */
export function autoClose(p: PollData, now = Date.now()): { at: number; reason: AutoCloseReason } | null {
  if (!p.autoCloseAt || p.closed || deadlinePassed(p, now) || (!!p.deadline && p.deadline <= p.autoCloseAt)) return null;
  const reason = (Object.entries(p.autoCloseWhy || {}).find(([, at]) => at === p.autoCloseAt)?.[0] || "limit") as AutoCloseReason;
  return { at: p.autoCloseAt, reason };
}

/**
 * Lo que le queda a una cuenta atrás, en días del calendario (cambia cada día): «Se cierra en 5 días», «Se cierra
 * mañana» y, el último, «Último día». El servidor la cierra al acabar ese día, así que al siguiente ya está cerrada.
 */
export function closingLabel(at: number, now = Date.now()) {
  const day = (ts: number) => D.parseDay(D.keyOfDate(new Date(ts))).getTime();
  const days = Math.round((day(at) - day(now)) / 86400000); // round: los días del cambio de hora no duran 24 h
  if (days <= 0) return "Último día";
  if (days === 1) return "Se cierra mañana";
  return `Se cierra en ${days} días`;
}

/** Por qué se cerrará sola y qué se puede hacer, para quien la gestiona (`manager`) o para los demás. */
export function autoCloseNote(reason: AutoCloseReason, at: number, manager: boolean) {
  const when = fmtDeadline(at);
  if (reason === "limit") {
    return manager
      ? `Tienes más de ${FREE_OPEN} votaciones abiertas a la vez: esta se cerrará sola el ${when}. Cierra otra para mantenerla abierta.`
      : `Quien la gestiona tiene más votaciones abiertas de las que permite su plan: se cerrará sola el ${when}.`;
  }
  return manager
    ? `Usa funciones premium y no tienes premium: se cerrará sola el ${when}. Con premium seguirá abierta.`
    : `Usa funciones premium y quien la gestiona ya no tiene premium: se cerrará sola el ${when}.`;
}
/** Desde cuántos participantes aparecen el buscador y los filtros de la tabla. */
export const PEOPLE_FILTER_FROM = 10;
/** Correos permitidos como mucho en una votación privada. */
export const MAX_EMAILS = MAX_PEOPLE;
/** Administradores nombrados como mucho (sin contar al creador); el mismo tope que las reglas. */
export const MAX_ADMINS = 20;

// ----- Chat -----
/** Motivos para denunciar un mensaje, con su texto. */
export const REPORT_REASONS: Record<ReportReason, string> = {
  ofensivo: "Insultos, acoso u ofensas",
  spam: "Spam o publicidad",
  inapropiado: "Contenido inapropiado o peligroso",
  otro: "Otro motivo",
};
/** Largo máximo de la descripción de una votación (el mismo que validan las reglas). */
export const MAX_DESCRIPTION = 300;
/** Largo máximo de una dirección de correo (RFC 5321). */
export const MAX_EMAIL = 254;
/** Largo máximo del comentario de una denuncia (el mismo que validan las reglas). */
export const MAX_REPORT_COMMENT = 200;
/** Las denuncias agrupadas por mensaje (msgId → sus denuncias), para marcarlos a quien administra. */
export function reportsByMessage(reports: ChatReport[]) {
  const out = new Map<string, ChatReport[]>();
  for (const r of reports) out.set(r.msgId, [...(out.get(r.msgId) || []), r]);
  return out;
}

/** Las denuncias de personas agrupadas por persona denunciada (uid → sus denuncias), para quien administra. */
export function reportsByPerson(reports: PersonReport[]) {
  const out = new Map<string, PersonReport[]>();
  for (const r of reports) out.set(r.targetUid, [...(out.get(r.targetUid) || []), r]);
  return out;
}

/** Lo de la votación que va en «Descargar mis datos»: lo que la describe, sin datos de los demás. */
export function pollForExport(p: PollData | null, uid: string): MyPollData["poll"] {
  if (!p) return null;
  return {
    title: p.title, description: p.description, type: p.type, createdAt: p.createdAt, closed: p.closed,
    ownerName: p.ownerName, iCreatedIt: (p.founder || p.ownerUid) === uid,
  };
}

/**
 * Un aviso del chat (`sys`: «ha añadido el martes 16», «ha vuelto a admitir a Cris») contado a quien lo lee: si lo
 * hizo él, en segunda persona y sin su nombre («has añadido…»); si habla de él, con «te» («te ha vuelto a admitir»).
 */
export function sysTextFor(text: string, own: boolean, myName: string) {
  if (own) return text.replace(/^ha /, "has ");
  const about = ` a ${myName}`;
  return myName && text.endsWith(about) ? "te " + text.slice(0, -about.length) : text;
}

/** Mensajes que se traen de una votación: solo los últimos, que esto no es WhatsApp. */
export const CHAT_LIMIT = 200;
/** Longitud máxima de un mensaje (la misma que validan las reglas). */
export const MAX_CHAT = 500;

/** En una votación restringida, quien no está aceptado no puede ver los votos de los demás. */
export const isRestricted = (p: PollData) => !!(p.approval || p.emailsOnly);
export const memberStatus = (v?: Vote | null): MemberStatus =>
  v?.status === "pending" ? "pending" : v?.status === "rejected" ? "rejected" : "accepted";
/** Solo cuentan (recuentos, ranking y tabla) los participantes aceptados. */
export const acceptedVotes = (votes: Votes): Votes =>
  Object.fromEntries(Object.entries(votes).filter(([, v]) => !v?.status));
export const hasLimit = (p: PollData) => typeof p.maxPeople === "number";
/** Sigue en la votación (aceptado y sin haberse ido): su voto lleva su nombre y su foto de ahora. */
export const isPresent = (v?: Vote | null) => !!v && !v.status && !v.gone;
/** Administra la votación: el creador o alguien que él ha nombrado administrador. */
export const isAdmin = (p: PollData, uid: string) => p.ownerUid === uid || !!p.admins?.includes(uid);

/**
 * Desde cuándo ve el chat alguien: quien crea la votación, todo; los demás, desde que entraron (los mensajes de
 * antes no son para ellos). 0 = todo, también para los votos de antes de guardar `joinedAt`.
 */
export const chatSince = (p: PollData, uid: string, vote: Vote | null | undefined) =>
  p.ownerUid === uid ? 0 : vote?.joinedAt || 0;
/**
 * Tiene mensajes sin leer en el chat de esa votación (el icono de «Mis votaciones»): el último mensaje (`chatAt` de la
 * votación) es posterior a lo que ha visto y a cuando la añadió a su lista (lo de antes de entrar no es para él).
 */
export const hasUnreadChat = (e: LibraryEntry, p: PollData) =>
  (p.chatAt || 0) > Math.max(e.chatSeenAt || 0, e.addedAt || 0);
/** Un administrador le expulsó de la votación (ya estaba dentro): no puede volver a entrar ni votar. */
export const isRemoved = (v?: Vote | null) => v?.status === "rejected" && !!v.removed;

export type Role = "creator" | "delegate" | "admin";
/** Papel en la votación. Si el creador se fue, sigue siendo «Creador» (con su nombre sin dueño) y quien la gestiona es «Delegado». */
export function roleOf(p: PollData, uid: string): Role | null {
  if (uid === p.founder) return "creator";
  if (uid === p.ownerUid) return p.founder ? "delegate" : "creator";
  return p.admins?.includes(uid) ? "admin" : null;
}
export const ROLE_NAME: Record<Role, string> = { creator: "Creador", delegate: "Delegado", admin: "Admin" };

export interface LosingAccess {
  uid: string;
  name: string;
  email: string;
  /** Solo había pedido entrar (con aprobación): se rechaza su solicitud en vez de expulsarle. */
  pending: boolean;
  admin: boolean;
}

/**
 * Al cambiar la lista de una votación solo con correos (de `before` a `after`): quién está dentro, o pendiente, con
 * un correo que se quita, según `memberEmails` (uid → correo con el que entró). Nunca quien la gestiona, que siempre
 * puede entrar. Quien no apuntó su correo (entró antes de que se guardara y no ha vuelto) no se reconoce.
 */
export function losingAccess(p: PollData, votes: Votes, memberEmails: Record<string, string>, before: string[], after: string[]): LosingAccess[] {
  const kept = new Set(after.map(e => e.toLowerCase()));
  const removed = new Set(before.map(e => e.toLowerCase()).filter(e => !kept.has(e)));
  return Object.entries(memberEmails)
    .filter(([uid, email]) => uid !== p.ownerUid && removed.has(email.toLowerCase()))
    .flatMap(([uid, email]) => {
      const v = votes[uid];
      if (!v || v.gone || v.status === "rejected") return [];
      return [{ uid, name: v.name || "Alguien", email, pending: v.status === "pending", admin: !!p.admins?.includes(uid) }];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export interface ManagedPerson {
  uid: string;
  name: string;
  photo: string;
  role: Role | null;
  /** Puede nombrarle o quitarle de administrador (solo quien gestiona la votación, y nunca a sí mismo). */
  canToggleAdmin: boolean;
  /** Puede expulsarle: cualquier administrador, salvo a quien la gestiona, a sí mismo y, si no es el gestor, a otro administrador. */
  canRemove: boolean;
}

/**
 * «Gestionar participantes», visto por `me`: quienes siguen dentro (primero quien la gestiona, después los
 * administradores y el resto por nombre) y quienes han sido expulsados (para volver a admitirlos).
 */
export function managedPeople(p: PollData, votes: Votes, me: string): { inside: ManagedPerson[]; removed: ManagedPerson[] } {
  const owner = p.ownerUid === me;
  const admins = p.admins || [];
  const order = (x: ManagedPerson) => (x.uid === p.ownerUid ? 0 : x.role === "admin" ? 1 : 2);
  const person = (uid: string, v: Vote): ManagedPerson => {
    const role = roleOf(p, uid);
    const mine = uid === me || uid === p.ownerUid;
    return {
      uid, name: v.name || "Alguien", photo: v.photo || "", role,
      canToggleAdmin: owner && !mine,
      canRemove: isAdmin(p, me) && !mine && (owner || !admins.includes(uid)),
    };
  };
  const all = Object.entries(votes).filter(([, v]) => v && !v.gone);
  const byName = (a: ManagedPerson, b: ManagedPerson) => order(a) - order(b) || a.name.localeCompare(b.name, "es");
  return {
    inside: all.filter(([, v]) => !v.status).map(([u, v]) => person(u, v)).sort(byName),
    removed: all.filter(([, v]) => isRemoved(v)).map(([u, v]) => person(u, v)).sort(byName),
  };
}

/** Nombres para quien se va (sale de la votación o elimina su cuenta): alguien que estuvo y ya no está. */
const GHOST_NAMES = [
  "Un suspiro", "Una sombra lejana", "Un recuerdo", "Un eco", "Un susurro", "Una huella en la arena",
  "Alguien que estuvo", "Una silla vacía", "Un nombre olvidado", "Una voz lejana", "Un adiós callado",
  "Polvo de estrellas", "Una hoja que se llevó el viento", "Un abrazo pendiente", "La última luz de la tarde",
];
export const ghostName = () => GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];

/**
 * Quién hereda la votación cuando su creador se va: un administrador al azar o, si no hay, cualquier participante
 * aceptado que siga (nunca quien también se fue: la votación se quedaría sin nadie que la gestione).
 * null si no queda nadie.
 */
export function pickHeir(votes: Votes, leaving: string, admins: string[] = []): string | null {
  const stay = Object.entries(votes).filter(([u, v]) => u !== leaving && !v?.status && !v?.gone).map(([u]) => u);
  const pool = stay.filter(u => admins.includes(u));
  const from = pool.length ? pool : stay;
  return from.length ? from[Math.floor(Math.random() * from.length)] : null;
}

/**
 * Si quien se va de la votación deja sus votos: solo si ya no se puede votar (cerrada o con el plazo pasado) y no
 * hay un desempate abierto. Si no, sus votos se borran (y en un desempate puede deshacerse el empate).
 */
export const keepsVotesOnLeave = (p: PollData) =>
  (!!p.closed || deadlinePassed(p)) && !(p.tiebreak && !p.tiebreak.done);
export const isFull = (p: PollData) => hasLimit(p) && (p.members || 0) >= (p.maxPeople as number);
/**
 * Lo menos que se puede poner de máximo: las plazas ya ocupadas (y nunca menos de 2). Ocupan plaza quienes están
 * dentro, las solicitudes pendientes y quien se fue con sus votos; no, los rechazados ni los expulsados. Las reglas
 * exigen lo mismo (members <= maxPeople).
 */
export const minMaxPeople = (p: PollData) => Math.max(2, p.members || 0);

// ----- Plazo para votar -----
/** Tiene plazo y ya ha pasado: no se admiten votos aunque `closed` siga false. */
export const deadlinePassed = (p: PollData, now = Date.now()) => !!p.deadline && now >= p.deadline;
/** «mié 23 dic», con la hora solo si el plazo no acaba con el día. */
export function fmtDeadline(ts: number) {
  const dt = new Date(ts);
  const day = D.fmtDayShort(D.keyOfDate(dt));
  return dt.getHours() === 23 && dt.getMinutes() === 59 ? day : `${day}, ${D.pad(dt.getHours())}:${D.pad(dt.getMinutes())}`;
}

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
/** Lee una lista de correos separados por comas, espacios, punto y coma o saltos de línea. */
export function parseEmails(text: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = [], invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().replace(/^<|>$/g, "").toLowerCase();
    if (!e) continue;
    if (!EMAIL.test(e)) invalid.push(raw.trim());
    else if (!emails.includes(e)) emails.push(e);
  }
  return { emails, invalid };
}
const SINGLE: PollOption[] = [{ id: "v", name: "Votos", icon: "" }];

export const plural = (n: number, [one, many]: readonly [string, string]) => `${n} ${n === 1 ? one : many}`;
export const unitKey = (slot: string, opt: string) => `${slot}|${opt}`;

export const pollOptions = (poll: PollData) => (poll.type === "days" && poll.options?.length ? poll.options : SINGLE);

/** Horas votables de un día: por día si es `hourList` (con reserva para votaciones antiguas sin `hoursByDay`), o las franjas periódicas. */
export function hoursForDay(poll: PollData, day: string): string[] {
  if (poll.hourList) return poll.hoursByDay?.[day] ?? poll.hours ?? [];
  return poll.hours || [];
}

/** Opción libre de la casilla `slot` (en las votaciones de opciones libres, cada casilla es una opción). */
export const choiceOf = (poll: PollData, slot: string) => poll.options?.find(o => o.id === slot);
const choiceText = (poll: PollData, slot: string) => {
  const c = choiceOf(poll, slot);
  return c ? `${c.icon || DEFAULT_CHOICE_ICON} ${c.name}` : "Opción";
};

// Claves de cada casilla votable (sin la opción).
export function slotKeys(poll: PollData) {
  if (poll.type === "options") return (poll.options || []).map(o => o.id);
  if (poll.type === "hours") return poll.slots.flatMap(d => hoursForDay(poll, d).map(h => `${d}T${h}`));
  return poll.slots;
}

export function slotLabel(poll: PollData, slot: string) {
  switch (poll.type) {
    case "hours": {
      const [d, h] = slot.split("T");
      if (poll.hourList) return `${D.cap(D.fmtDayShort(d))} · ${h}`;
      const end = D.hhmm(D.minutesOf(h) + (poll.hourStep || 60));
      return `${D.cap(D.fmtDayShort(d))} · ${h}–${end}`;
    }
    case "weeks": return D.fmtWeek(slot);
    case "months": return D.cap(D.fmtMonth(slot));
    case "options": return choiceText(poll, slot);
    default: return D.cap(D.fmtDayLong(slot));
  }
}

export interface Person {
  uid: string;
  name: string;
  photo: string;
  perOpt: Record<string, number>;
  total: number;
  picks: string[];
  /** Se fue y sus votos se quedan con un nombre sin dueño (Vote.gone): va en «Se fueron». */
  gone: boolean;
}

export interface RankEntry {
  key: string;
  opt: PollOption;
  index: number;
  slot: string;
  votes: number;
  rank: number;
}

export interface Tally {
  opts: PollOption[];
  slots: string[];
  valid: Set<string>;
  counts: Record<string, number>;
  voters: Record<string, string[]>;
  best: Set<string>;
  ranking: RankEntry[];
  top: RankEntry[];
  leaders: RankEntry[];
  people: Person[];
}

/** Claves que se pueden votar ("<casilla>|<opción>"). */
export function validUnits(poll: PollData) {
  const opts = pollOptions(poll);
  const valid = new Set<string>();
  slotKeys(poll).forEach(s => opts.forEach(o => valid.add(unitKey(s, o.id))));
  return valid;
}

/** «🍽️ Comida · Viernes 18 de diciembre» (o solo la casilla, si la votación no es de días). */
export function unitLabel(poll: PollData, u: string) {
  const { slot, optId } = unitParts(u);
  const o = poll.type === "days" ? pollOptions(poll).find(x => x.id === optId) : null;
  return o ? `${o.icon} ${o.name} · ${slotLabel(poll, slot)}` : slotLabel(poll, slot);
}

/**
 * Al editar una votación: la primera casilla con votos que desaparece con el cambio de `old` a `next` (o null). Lo
 * que ya tiene votos no se puede quitar. Solo cuentan los votos a casillas que existían.
 */
export function lostVotedUnit(old: PollData, next: PollData, votes: Votes): string | null {
  const before = validUnits(old), after = validUnits(next);
  for (const v of Object.values(votes)) {
    for (const p of v?.picks || []) if (before.has(p) && !after.has(p)) return p;
  }
  return null;
}

// Recuento de votos: por casilla+opción, mejores casillas y resumen por persona.
export function tally(poll: PollData, votes: Votes): Tally {
  const opts = pollOptions(poll);
  const slots = slotKeys(poll);
  const valid = validUnits(poll);

  const counts: Record<string, number> = {};
  const voters: Record<string, string[]> = {}; // casilla+opción -> [uid]
  const people: Person[] = [];
  for (const uid in votes) {
    const v = votes[uid] || {};
    const perOpt: Record<string, number> = Object.fromEntries(opts.map(o => [o.id, 0]));
    const picks: string[] = [];
    for (const p of new Set(v.picks || [])) {
      if (!valid.has(p)) continue;
      counts[p] = (counts[p] || 0) + 1;
      (voters[p] ||= []).push(uid);
      perOpt[p.slice(p.lastIndexOf("|") + 1)]++;
      picks.push(p);
    }
    people.push({ uid, name: v.name || "Alguien", photo: v.photo || "", perOpt, total: picks.length, picks: picks.sort(), gone: !!v.gone });
  }
  people.sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Borde verde del calendario: lo más votado de cada opción.
  const best = new Set<string>();
  opts.forEach(o => {
    let max = 0;
    slots.forEach(s => { max = Math.max(max, counts[unitKey(s, o.id)] || 0); });
    if (max) slots.forEach(s => { if (counts[unitKey(s, o.id)] === max) best.add(unitKey(s, o.id)); });
  });

  // Clasificación general (todas las opciones juntas). Los empates comparten puesto: 1, 1, 3…
  const ranking: RankEntry[] = [];
  opts.forEach((o, i) => slots.forEach(s => {
    const key = unitKey(s, o.id);
    if (counts[key]) ranking.push({ key, opt: o, index: i, slot: s, votes: counts[key], rank: 0 });
  }));
  ranking.sort((a, b) => b.votes - a.votes || a.slot.localeCompare(b.slot) || a.index - b.index);
  ranking.forEach((e, k) => { e.rank = k && e.votes === ranking[k - 1].votes ? ranking[k - 1].rank : k + 1; });
  const top = ranking.slice(0, TOP_N);
  const leaders = ranking.filter(e => e.rank === 1);

  return { opts, slots, valid, counts, voters, best, ranking, top, leaders, people };
}

/**
 * Empatadas en el primer puesto que no coinciden con las del desempate abierto: alguien dejó de participar (salió,
 * eliminó su cuenta o le rechazaron) y sus votos ya no cuentan. null si el desempate está al día. Ver TiebreakGuard.
 */
export function tiebreakShift(poll: PollData, T: Tally): string[] | null {
  const tb = poll.tiebreak;
  if (!poll.closed || !tb || tb.done) return null;
  const leaders = T.leaders.map(e => e.key).slice(0, 50);
  const same = leaders.length === tb.candidates.length && leaders.every(k => tb.candidates.includes(k));
  return same ? null : leaders;
}

/**
 * La votación con el desempate ya ajustado si alguien dejó de participar (tiebreakShift), aunque ningún
 * administrador lo haya guardado todavía: así todos lo ven al momento, con el mismo aviso (tbNote) que dejará
 * TiebreakGuard al guardarlo. Los votos del desempate siguen valiendo: las opciones que quedan ya estaban en él.
 */
export function withTiebreakAdjusted<P extends PollData>(poll: P, T: Tally): P {
  const leaders = tiebreakShift(poll, T);
  const tb = poll.tiebreak;
  if (!leaders || !tb) return poll;
  return leaders.length < 2
    ? { ...poll, tiebreak: null, tbNote: { at: 0, solved: true } }
    : { ...poll, tiebreak: { ...tb, candidates: leaders }, tbNote: { at: 0, solved: false, tb: tb.id, n: leaders.length } };
}

export interface TiebreakTally {
  id: number;
  candidates: string[];
  done: boolean;
  round?: number;
  counts: Record<string, number>;
  voters: Record<string, string[]>;
  max: number;
  leaders: string[];
  total: number;
}

// Recuento del desempate: solo cuentan los votos de esta ronda (mismo id) a una opción candidata.
export function tiebreakTally(poll: Poll, votes: Votes): TiebreakTally | null {
  const tb = poll.tiebreak;
  if (!tb || !Array.isArray(tb.candidates)) return null;
  const counts: Record<string, number> = Object.fromEntries(tb.candidates.map(c => [c, 0]));
  const voters: Record<string, string[]> = Object.fromEntries(tb.candidates.map(c => [c, []]));
  for (const uid in votes) {
    const v = votes[uid]?.tb;
    if (v && v.id === tb.id && v.pick in counts) { counts[v.pick]++; voters[v.pick].push(uid); }
  }
  const max = Math.max(0, ...Object.values(counts));
  const leaders = max ? tb.candidates.filter(c => counts[c] === max) : [];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { ...tb, counts, voters, max, leaders, total };
}

/**
 * El desempate terminó con una sola ganadora: es el resultado definitivo. Ya no se puede reabrir la votación ni el
 * desempate (las reglas no dejan reabrir ninguna votación con un desempate finalizado).
 */
export const isFinal = (TB: TiebreakTally | null) => !!TB?.done && TB.leaders.length === 1;
/** La ganadora, si no queda empate: la del desempate finalizado o, sin desempate, la única más votada. */
export const winnerKey = (T: Tally, TB: TiebreakTally | null) =>
  TB ? (isFinal(TB) ? TB.leaders[0] : null) : (T.leaders.length === 1 ? T.leaders[0].key : null);
/** Desempate finalizado sin ganadora única (sigue el empate o nadie votó): solo se puede repetir. */
export const tiebreakUnsolved = (TB: TiebreakTally | null) => !!TB?.done && TB.leaders.length !== 1;
/** Entre qué opciones se repite un desempate sin ganadora: las que siguen empatadas o, si nadie votó, las mismas. */
export const repeatCandidates = (TB: TiebreakTally) => (TB.leaders.length > 1 ? TB.leaders : TB.candidates);

export const unitParts = (u: string) => { const i = u.lastIndexOf("|"); return { slot: u.slice(0, i), optId: u.slice(i + 1) }; };

// Etiqueta corta de una casilla, para listas compactas: "lun 22 dic", "S52 · 21–27 dic"…
export function slotShort(poll: PollData, slot: string) {
  switch (poll.type) {
    case "hours": { const [d, h] = slot.split("T"); return `${D.fmtDayShort(d)} ${h}`; }
    case "weeks": return `S${D.isoWeek(D.parseDay(slot))} · ${D.fmtWeekRange(slot)}`;
    case "months": return D.cap(D.fmtMonth(slot));
    case "options": return choiceText(poll, slot);
    default: return D.fmtDayShort(slot);
  }
}

// Descripción corta para listados: cuántas casillas se votan («17 días», «5 opciones»). El tipo ya lo dice el icono.
export function pollMeta(poll: PollData) {
  if (poll.type === "options") return plural(poll.options?.length || 0, TYPE.options.unit);
  // Las de horas se cuentan por días: es lo que se recuerda («el viernes y el sábado»), no las franjas.
  return plural(poll.slots.length, poll.type === "hours" ? ["día", "días"] : TYPE[poll.type].unit);
}

// Texto con el periodo en el que se puede votar.
export function pollRange(poll: PollData) {
  if (poll.type === "options") return `Se elige entre ${plural(poll.options?.length || 0, ["opción", "opciones"])}.`;
  const s = [...poll.slots].sort();
  if (!s.length) return "";
  const first = s[0], last = s[s.length - 1];
  if (poll.type === "months") {
    return s.length === 1 ? `Se vota ${D.fmtMonth(first)}.` : `Se vota entre ${D.fmtMonth(first)} y ${D.fmtMonth(last)}.`;
  }
  if (poll.type === "weeks") {
    return s.length === 1
      ? `Se vota la semana del ${D.fmtWeekRange(first)}.`
      : `${plural(s.length, ["semana", "semanas"])} disponibles, del ${D.fmtDayPlain(first)} al ${D.fmtDayPlain(D.weekEndKey(last))}.`;
  }
  if (s.length === 1) return `Se vota el ${D.fmtDayLong(first)}.`;
  const contiguous = D.daysBetween(first, last).length === s.length;
  return contiguous
    ? `Solo se puede votar del ${D.fmtDayPlain(first)} al ${D.fmtDayPlain(last)}.`
    : `${plural(s.length, ["día", "días"])} disponibles entre el ${D.fmtDayPlain(first)} y el ${D.fmtDayPlain(last)}.`;
}
