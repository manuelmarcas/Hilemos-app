// Utilidades de fechas. Todas las claves son cadenas ordenables:
//   día   -> "YYYY-MM-DD"
//   mes   -> "YYYY-MM"
//   semana-> "YYYY-MM-DD" del lunes de esa semana
//   hora  -> "HH:MM"

export const MNAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MSHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DOW = ["L", "M", "X", "J", "V", "S", "D"];
export const DNAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const DSHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const monthKey = (y: number, m: number) => `${y}-${pad(m + 1)}`;
export const keyOfDate = (dt: Date) => dayKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
export const parseDay = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const parseMonth = (k: string) => { const [y, m] = k.split("-").map(Number); return { y, m: m - 1 }; };
export const monthOfDay = (k: string) => k.slice(0, 7);
export const addDays = (dt: Date, n: number) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
export const dowMon = (dt: Date) => (dt.getDay() + 6) % 7; // 0 = lunes ... 6 = domingo
export const mondayOf = (dt: Date) => addDays(dt, -dowMon(dt));
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const todayKey = () => keyOfDate(new Date());
export const currentMonthKey = () => todayKey().slice(0, 7);
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Número de semana ISO-8601.
export function isoWeek(dt: Date) {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export interface WeekRow {
  key: string;
  num: number;
  days: { key: string; d: number; inMonth: boolean; dow: number }[];
}

// Filas (semanas de lunes a domingo) que forman el calendario de un mes.
export function monthWeeks(y: number, m: number): WeekRow[] {
  const last = new Date(y, m + 1, 0);
  const weeks: WeekRow[] = [];
  for (let start = mondayOf(new Date(y, m, 1)); start <= last; start = addDays(start, 7)) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dt = addDays(start, i);
      days.push({ key: keyOfDate(dt), d: dt.getDate(), inMonth: dt.getMonth() === m, dow: i });
    }
    weeks.push({ key: keyOfDate(start), num: isoWeek(start), days });
  }
  return weeks;
}

export const weekEndKey = (wk: string) => keyOfDate(addDays(parseDay(wk), 6));

// Todos los días entre a y b (incluidos), en orden.
export function daysBetween(a: string, b: string) {
  if (a > b) [a, b] = [b, a];
  const out: string[] = [];
  for (let dt = parseDay(a), end = parseDay(b); dt <= end; dt = addDays(dt, 1)) out.push(keyOfDate(dt));
  return out;
}

export const minutesOf = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const hhmm = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

// Franjas que empiezan en `from` y duran `step` minutos sin pasar de `to`.
export function hourRange(from: string, to: string, step: number) {
  const out: string[] = [];
  const end = minutesOf(to);
  for (let t = minutesOf(from); t + step <= end; t += step) out.push(hhmm(t));
  return out;
}

export function fmtDayLong(k: string) {
  const dt = parseDay(k);
  return `${DNAMES[dowMon(dt)]} ${dt.getDate()} de ${MNAMES[dt.getMonth()]}`;
}
export function fmtDayShort(k: string) {
  const dt = parseDay(k);
  return `${DSHORT[dowMon(dt)]} ${dt.getDate()} ${MSHORT[dt.getMonth()]}`;
}
export const fmtDayPlain = (k: string) => { const dt = parseDay(k); return `${dt.getDate()} de ${MNAMES[dt.getMonth()]}`; };
export function fmtMonth(mk: string) {
  const { y, m } = parseMonth(mk);
  return `${MNAMES[m]} ${y}`;
}
export function fmtWeekRange(wk: string) {
  const s = parseDay(wk), e = addDays(s, 6);
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}–${e.getDate()} ${MSHORT[e.getMonth()]}`
    : `${s.getDate()} ${MSHORT[s.getMonth()]} – ${e.getDate()} ${MSHORT[e.getMonth()]}`;
}
export const fmtWeek = (wk: string) => `Semana ${isoWeek(parseDay(wk))} · ${fmtWeekRange(wk)}`;
