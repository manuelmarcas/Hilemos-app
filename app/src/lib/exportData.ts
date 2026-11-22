// Datos de una votación preparados para exportar (CSV, Excel y PDF): una fila por casilla que se puede votar, en el
// orden del calendario, y la lista de participantes. Sin pantalla, para poder probarlo.
import * as D from "./dates";
import { ROLE_NAME, TYPE, plural, roleOf, slotLabel, unitKey, unitParts, winnerKey, type Tally, type TiebreakTally } from "./model";
import type { PollData } from "./types";
import { slugify } from "./util";
import { buildXlsx, type XCell, type XColors, type XSheet } from "./xlsx";

export interface ExportRow {
  /** Casilla y opción («<casilla>|<opción>»). */
  key: string;
  /** Lo que describe la casilla, una celda por columna de `ExportTable.columns` («Viernes 18 de diciembre de 2026», «🍽️ Comida»). */
  labels: string[];
  votes: number;
  /** Puesto en la clasificación general (los empates lo comparten); null si no tiene votos. */
  rank: number | null;
  /** Votos en el desempate; null si no es una de las opciones del desempate (o no lo hay). */
  tb: number | null;
  winner: boolean;
  /** Quién la votó (uids), en el orden de `ExportTable.people`. */
  voters: string[];
}

export interface ExportPerson {
  uid: string;
  name: string;
  /** Creador, Delegado o Admin; vacío si es un participante más. */
  role: string;
  /** Casillas que ha votado. */
  total: number;
  /** Se fue con la votación cerrada: sus votos siguen contando, con un nombre sin dueño. */
  gone: boolean;
}

export interface ExportTable {
  title: string;
  /** «Votación por días · 12 participantes · cerrada». */
  meta: string;
  /** Nombre de las columnas que describen cada casilla. */
  columns: string[];
  rows: ExportRow[];
  people: ExportPerson[];
  anonymous: boolean;
  tiebreak: boolean;
}

const withYear = (day: string) => `${D.cap(D.fmtDayLong(day))} de ${day.slice(0, 4)}`;

/** Columnas que describen una casilla según el tipo de votación. */
function columnsOf(poll: PollData): string[] {
  switch (poll.type) {
    case "days": return poll.options?.length ? ["Día", "Opción"] : ["Día"];
    case "hours": return ["Día", "Hora"];
    case "weeks": return ["Semana"];
    case "months": return ["Mes"];
    default: return ["Opción"];
  }
}

/** Los valores de esas columnas para una casilla. */
function labelsOf(poll: PollData, key: string, optName: (id: string) => string): string[] {
  const { slot, optId } = unitParts(key);
  switch (poll.type) {
    case "days": return poll.options?.length ? [withYear(slot), optName(optId)] : [withYear(slot)];
    case "hours": return [withYear(slot.split("T")[0]), slotLabel(poll, slot).split(" · ").pop() || ""];
    case "weeks": return [`${slotLabel(poll, slot)} de ${slot.slice(0, 4)}`];
    default: return [slotLabel(poll, slot)];
  }
}

/** La votación como tabla: todas las casillas (también las que no tienen votos) y quién votó cada una. */
export function exportTable(poll: PollData, T: Tally, TB: TiebreakTally | null): ExportTable {
  const optName = (id: string) => {
    const o = T.opts.find(x => x.id === id);
    return o ? `${o.icon} ${o.name}`.trim() : "";
  };
  const rankOf = new Map(T.ranking.map(e => [e.key, e.rank]));
  const win = winnerKey(T, TB);
  // En el orden del calendario: cada día con sus opciones seguidas.
  const keys = T.slots.flatMap(s => T.opts.map(o => unitKey(s, o.id)));
  const rows = keys.map(key => ({
    key,
    labels: labelsOf(poll, key, optName),
    votes: T.counts[key] || 0,
    rank: rankOf.get(key) ?? null,
    tb: TB && key in TB.counts ? TB.counts[key] : null,
    winner: key === win,
    voters: T.voters[key] || [],
  }));
  const people = T.people.map(p => {
    const role = roleOf(poll, p.uid);
    return { uid: p.uid, name: p.name, role: role ? ROLE_NAME[role] : "", total: p.total, gone: p.gone };
  });
  const info = TYPE[poll.type];
  const present = people.filter(p => !p.gone).length;
  const meta = [`Votación por ${info.name.toLowerCase()}`, plural(present, ["participante", "participantes"])];
  if (poll.closed) meta.push("cerrada");
  if (poll.anonymous) meta.push("anónima");
  return {
    title: poll.title, meta: meta.join(" · "), columns: columnsOf(poll), rows, people, anonymous: !!poll.anonymous, tiebreak: !!TB,
  };
}

/** Las filas ordenadas como una clasificación: primero las más votadas; las que no tienen votos, al final. */
export const rankedRows = (t: ExportTable) =>
  [...t.rows].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || t.rows.indexOf(a) - t.rows.indexOf(b));

/** Nombres de quienes votaron una fila. */
export function voterNames(t: ExportTable, row: ExportRow) {
  const name = new Map(t.people.map(p => [p.uid, p.name]));
  return row.voters.map(u => name.get(u) || "Alguien").sort((a, b) => a.localeCompare(b, "es"));
}

// Una celda de CSV. Lo que empieza por = + - @ lo abriría una hoja de cálculo como fórmula: se le antepone un
// apóstrofo, porque los nombres los escribe cualquiera.
function csvCell(v: string | number | null) {
  if (v === null) return "";
  if (typeof v === "number") return String(v);
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV para guardar la votación: una fila por casilla con sus votos, su puesto y, si no es anónima, una columna por
 * persona («Sí» donde votó). Con punto y coma y la marca de UTF-8, que es lo que espera Excel en español.
 */
export function toCsv(t: ExportTable) {
  const head = [...t.columns, "Votos", "Puesto", ...(t.tiebreak ? ["Desempate"] : []), ...(t.anonymous ? [] : t.people.map(p => p.name))];
  const body = t.rows.map(r => {
    const mine = new Set(r.voters);
    return [...r.labels, r.votes, r.rank, ...(t.tiebreak ? [r.tb] : []), ...(t.anonymous ? [] : t.people.map(p => (mine.has(p.uid) ? "Sí" : "")))];
  });
  const BOM = String.fromCharCode(0xfeff);
  return BOM + [head, ...body].map(row => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

/** Nombre del archivo exportado: «cena-de-navidad-2026-11-22.csv». */
export const exportFileName = (title: string, ext: string) => `${slugify(title) || "votacion"}-${D.todayKey()}.${ext}`;

// Ancho de cada columna (en caracteres) para que quepa lo más largo, entre `min` y `max`.
const cellText = (c: XCell) => String((c !== null && typeof c === "object" ? c.v : c) ?? "");
const autoWidths = (rows: XCell[][], min = 6, max = 40) =>
  Array.from({ length: Math.max(0, ...rows.map(r => r.length)) }, (_, i) =>
    Math.min(max, Math.max(min, ...rows.map(r => (r[i] === undefined ? 0 : cellText(r[i]).length + 2)))));

/**
 * Excel con formato: «Resultados» (la clasificación, con la ganadora resaltada y quién votó cada una), «Votos» (una
 * columna por persona, con lo que votó marcado) y «Participantes». En las anónimas, solo «Resultados» y sin nombres.
 */
export function toXlsx(t: ExportTable, colors: XColors, exportedOn: string): Uint8Array<ArrayBuffer> {
  const ranked = rankedRows(t);
  const head = (s: string) => ({ v: s, s: "head" as const });
  const resultsHead = ["Puesto", ...t.columns, "Votos", ...(t.tiebreak ? ["Desempate"] : []), ...(t.anonymous ? [] : ["Quién"])];
  const resultsBody: XCell[][] = ranked.map(r => {
    const cells: (string | number | null)[] = [r.rank, ...r.labels, r.votes, ...(t.tiebreak ? [r.tb] : []),
      ...(t.anonymous ? [] : [voterNames(t, r).join(", ")])];
    return r.winner ? cells.map(v => ({ v, s: "best" as const })) : cells;
  });
  const results: XSheet = {
    name: "Resultados",
    rows: [
      [{ v: t.title, s: "title" }],
      [{ v: `${t.meta} · exportada el ${exportedOn}`, s: "muted" }],
      [],
      resultsHead.map(head),
      ...resultsBody,
    ],
    widths: autoWidths([resultsHead, ...resultsBody], 6, 60),
    freeze: { rows: 4, cols: 0 },
  };
  if (t.anonymous) return buildXlsx([results], colors);

  const votesRows: XCell[][] = [
    [...t.columns, "Votos", ...t.people.map(p => p.name)].map(head),
    ...t.rows.map(r => {
      const mine = new Set(r.voters);
      return [...r.labels, r.votes, ...t.people.map(p => (mine.has(p.uid) ? { v: "✓", s: "check" as const } : null))];
    }),
  ];
  const votes: XSheet = { name: "Votos", rows: votesRows, widths: autoWidths(votesRows, 5), freeze: { rows: 1, cols: t.columns.length + 1 } };
  const peopleRows: XCell[][] = [
    ["Nombre", "Papel", "Casillas votadas", "Estado"].map(head),
    ...t.people.map(p => [p.name, p.role, p.total, p.gone ? "Se fue (sus votos cuentan)" : ""]),
  ];
  const people: XSheet = { name: "Participantes", rows: peopleRows, widths: autoWidths(peopleRows), freeze: { rows: 1, cols: 0 } };
  return buildXlsx([results, votes, people], colors);
}
