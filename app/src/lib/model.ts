// Modelo de una votación y cálculo de recuentos.
//
// Documento `polls/{id}`: ver types.ts (PollData).
// Voto `polls/{id}/votes/{uid}`: { name, photo, picks: ["<slot>|<opción>", ...], tb: { id, pick } }

import * as D from "./dates";
import type { MemberStatus, Poll, PollData, PollOption, PollType, Vote, Votes } from "./types";
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
/** Desde cuántos participantes aparecen el buscador y los filtros de la tabla. */
export const PEOPLE_FILTER_FROM = 10;
/** Correos permitidos como mucho en una votación privada. */
export const MAX_EMAILS = MAX_PEOPLE;

// ----- Chat -----
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

// Descripción corta para listados: "Días · 17 días · 2 opciones".
export function pollMeta(poll: PollData) {
  const t = TYPE[poll.type];
  const parts = [t.name];
  if (poll.type === "hours") {
    parts.push(plural(poll.slots.length, ["día", "días"]));
    if (poll.hourList) {
      const total = poll.slots.reduce((a, d) => a + hoursForDay(poll, d).length, 0);
      parts.push(plural(total, ["hora", "horas"]) + " en total");
    } else {
      parts.push(plural(poll.hours?.length || 0, ["franja", "franjas"]) + " por día");
    }
  } else if (poll.type === "options") {
    parts.push(plural(poll.options?.length || 0, t.unit));
  } else {
    parts.push(plural(poll.slots.length, t.unit));
  }
  if (poll.type === "days") parts.push(plural(pollOptions(poll).length, ["opción", "opciones"]) + " por día");
  return parts.join(" · ");
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
