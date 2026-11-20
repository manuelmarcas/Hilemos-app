// Evento de calendario de la opción ganadora: fichero .ics para descargar y enlace de Google Calendar.
//
// Las horas van "flotantes" (sin Z ni TZID) porque la app guarda fechas locales sin zona horaria:
// las 21:00 que votó el grupo son las 21:00 de quien abre el evento.
import * as D from "./dates";
import { publicHost } from "./native";
import { pollOptions, unitParts } from "./model";
import type { PollData } from "./types";

export interface CalEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  /** Evento de día completo: en iCalendar y en Google, `end` es exclusivo. */
  allDay: boolean;
}

const HOUR_FALLBACK = 60; // duración de una hora suelta, que no tiene fin propio

const slug = (s: string) => (s || "votacion").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "votacion";

/** Evento de la casilla `unit` ("<casilla>|<opción>"), o null si no se puede interpretar. */
export function calendarEvent(poll: PollData, id: string, unit: string, url: string): CalEvent | null {
  const { slot, optId } = unitParts(unit);
  const opt = pollOptions(poll).find(o => o.id === optId);
  const name = poll.type === "days" && opt?.name ? `${opt.icon} ${opt.name}`.trim() : "";
  const title = name ? `${poll.title} - ${name}` : poll.title;
  const uid = `${id}-${slot.replace(/[^0-9A-Za-z]/g, "")}@${publicHost() || "votaciones"}`;
  const base = { uid, title, description: `Votación: ${url}` };

  if (poll.type === "hours") {
    const [day, h] = slot.split("T");
    if (!day || !h) return null;
    const start = D.parseDay(day);
    start.setMinutes(D.minutesOf(h));
    const mins = poll.hourList ? HOUR_FALLBACK : (poll.hourStep || HOUR_FALLBACK);
    const end = new Date(start.getTime() + mins * 60000);
    return { ...base, start, end, allDay: false };
  }
  if (poll.type === "months") {
    const { y, m } = D.parseMonth(slot);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    return { ...base, start: new Date(y, m, 1), end: new Date(y, m + 1, 1), allDay: true };
  }
  const start = D.parseDay(slot);
  if (Number.isNaN(start.getTime())) return null;
  return { ...base, start, end: D.addDays(start, poll.type === "weeks" ? 7 : 1), allDay: true };
}

const stamp = (dt: Date) => `${dt.getFullYear()}${D.pad(dt.getMonth() + 1)}${D.pad(dt.getDate())}`;
const stampTime = (dt: Date) => `${stamp(dt)}T${D.pad(dt.getHours())}${D.pad(dt.getMinutes())}00`;
const utcStamp = (dt: Date) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, m => `\\${m}`).replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

// iCalendar limita cada línea a 75 octetos: las más largas siguen en la línea siguiente, que empieza por un espacio.
function fold(line: string) {
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > 72) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

function icsFile(e: CalEvent) {
  const when = e.allDay
    ? [`DTSTART;VALUE=DATE:${stamp(e.start)}`, `DTEND;VALUE=DATE:${stamp(e.end)}`]
    : [`DTSTART:${stampTime(e.start)}`, `DTEND:${stampTime(e.end)}`];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hilemos//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    ...when,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(e: CalEvent) {
  const url = URL.createObjectURL(new Blob([icsFile(e)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(e.title)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); // revocarlo antes de que el navegador lo lea cancela la descarga
}

export function googleCalendarUrl(e: CalEvent) {
  const dates = e.allDay
    ? `${stamp(e.start)}/${stamp(e.end)}`
    : `${stampTime(e.start)}/${stampTime(e.end)}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, details: e.description, dates });
  return `https://calendar.google.com/calendar/render?${q}`;
}
