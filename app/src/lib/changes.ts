// Avisos para el chat cuando un administrador edita una votación: qué ha cambiado, en frases sin sujeto
// («ha añadido el martes 16 de diciembre») que el chat pinta detrás del nombre de quien lo hizo (ChatMessage.sys).
// Al editar se puede añadir de todo, pero no quitar lo que ya tiene votos (ver lostVotedUnit).
import * as D from "./dates";
import { MAX_CHAT, hoursForDay, plural } from "./model";
import type { PollData, PollOption } from "./types";

const MAX_LISTED = 6; // elementos que se nombran; del resto solo se dice cuántos son

/** «a», «a y b», «a, b y c», «a, b, c, d, e, f y 3 más». */
function list(items: string[]) {
  const shown = items.slice(0, MAX_LISTED);
  const rest = items.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} y ${rest} más`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} y ${shown[shown.length - 1]}` : shown[0] || "";
}

const q = (s: string) => `«${s}»`;
const optText = (o: PollOption) => `${o.icon} ${o.name}`.trim();
const sorted = (a: string[]) => [...a].sort();

/** Una casilla nombrada sola: «el martes 16 de diciembre», «la semana del 14 al 20 de diciembre», «enero de 2027». */
function slotOne(type: PollData["type"], s: string) {
  if (type === "weeks") return `la semana del ${D.fmtWeekRange(s)}`;
  if (type === "months") return D.fmtMonth(s);
  return `el ${D.fmtDayLong(s)}`;
}
/** Una casilla dentro de una lista: «mar 16 dic», «14–20 dic», «enero de 2027». */
function slotInList(type: PollData["type"], s: string) {
  if (type === "weeks") return D.fmtWeekRange(s);
  if (type === "months") return D.fmtMonth(s);
  return D.fmtDayShort(s);
}
const UNIT: Record<string, [string, string]> = {
  days: ["día", "días"], hours: ["día", "días"], weeks: ["semana", "semanas"], months: ["mes", "meses"],
};

/** «ha añadido el …» o «ha añadido 3 días: …» (o «ha quitado»). */
function slotsChange(verb: string, type: PollData["type"], keys: string[]) {
  if (!keys.length) return null;
  if (keys.length === 1) return `${verb} ${slotOne(type, keys[0])}`;
  return `${verb} ${plural(keys.length, UNIT[type])}: ${list(keys.map(k => slotInList(type, k)))}`;
}

/** Opciones añadidas, quitadas y cambiadas (mismo id con otro nombre o icono). `what`: «la opción», «la opción de cada día»… */
function optionsChange(old: PollOption[], next: PollOption[], one: string, many: [string, string]) {
  const out: string[] = [];
  const before = new Map(old.map(o => [o.id, o]));
  const after = new Map(next.map(o => [o.id, o]));
  const added = next.filter(o => !before.has(o.id)).map(optText);
  const removed = old.filter(o => !after.has(o.id)).map(optText);
  if (added.length) out.push(added.length === 1 ? `ha añadido ${one} ${q(added[0])}` : `ha añadido ${plural(added.length, many)}: ${list(added.map(q))}`);
  if (removed.length) out.push(removed.length === 1 ? `ha quitado ${one} ${q(removed[0])}` : `ha quitado ${plural(removed.length, many)}: ${list(removed.map(q))}`);
  next.forEach(o => {
    const b = before.get(o.id);
    if (b && optText(b) !== optText(o)) out.push(`ha cambiado ${one} ${q(optText(b))} por ${q(optText(o))}`);
  });
  return out;
}

/** Frases que describen el cambio de `old` a `next` (vacío si no ha cambiado nada que se vea). */
export function describeChanges(old: PollData, next: PollData): string[] {
  const out: string[] = [];
  if (old.title !== next.title) out.push(`ha cambiado el título: ${q(old.title)} → ${q(next.title)}`);
  if ((old.description || "") !== (next.description || "")) {
    out.push(next.description ? `ha cambiado la descripción: ${q(next.description)}` : "ha quitado la descripción");
  }

  if (next.type === "options") {
    out.push(...optionsChange(old.options || [], next.options || [], "la opción", ["opción", "opciones"]));
  } else {
    const was = new Set(old.slots), is = new Set(next.slots);
    const added = sorted(next.slots.filter(s => !was.has(s)));
    const removed = sorted(old.slots.filter(s => !is.has(s)));
    for (const t of [slotsChange("ha añadido", next.type, added), slotsChange("ha quitado", next.type, removed)]) if (t) out.push(t);

    if (next.type === "days") {
      out.push(...optionsChange(old.options || [], next.options || [], "la opción", ["opciones de cada día", "opciones de cada día"]));
    }
    if (next.type === "hours") {
      // Las horas de los días que ya estaban (las de los días nuevos van con ellos).
      const kept = next.slots.filter(d => was.has(d));
      const hoursOf = (p: PollData) => new Set(kept.flatMap(d => hoursForDay(p, d).map(h => `${d}T${h}`)));
      const a = hoursOf(old), b = hoursOf(next);
      const plus = sorted([...b].filter(k => !a.has(k)));
      const minus = sorted([...a].filter(k => !b.has(k)));
      if (!next.hourList) {
        // Franjas periódicas: son las mismas en todos los días, así que se nombran solo por su hora.
        const hs = (keys: string[]) => [...new Set(keys.map(k => k.split("T")[1]))].sort();
        const franjas = (verb: string, h: string[]) => h.length && out.push(h.length === 1
          ? `${verb} la franja de las ${h[0]}`
          : `${verb} las franjas de las ${list(h)}`);
        franjas("ha añadido", hs(plus));
        franjas("ha quitado", hs(minus));
      } else {
        const label = (k: string) => { const [d, h] = k.split("T"); return `${D.fmtDayShort(d)} ${h}`; };
        const horas = (verb: string, keys: string[]) => keys.length && out.push(keys.length === 1
          ? `${verb} la hora ${label(keys[0])}`
          : `${verb} ${plural(keys.length, ["hora", "horas"])}: ${list(keys.map(label))}`);
        horas("ha añadido", plus);
        horas("ha quitado", minus);
      }
    }
  }
  return out.map(t => (t.length > MAX_CHAT ? t.slice(0, MAX_CHAT - 1) + "…" : t));
}
