// Fechas en hora de España, la de Hilemos: los días de las estadísticas, el final del día de las cuentas atrás y las
// fechas de los avisos. Las Cloud Functions corren en UTC, así que se calcula a mano con Intl.
export const DAY = 86400000;
const MADRID = "Europe/Madrid";

/** Año, mes (1-12), día, hora y minuto de `ts` en hora de España. */
export function madridParts(ts) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  return Object.fromEntries(f.formatToParts(new Date(ts)).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
}

/** El instante (ms) de esa fecha y hora en España. Los cambios de hora son de madrugada: a las 0:00 y a las 23:59 no hay dudas. */
export function madridTime(year, month, day, hour = 0, minute = 0) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const p = madridParts(wall);
  return wall - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - wall);
}

/** Las 0:00 del día de `ts` en España. */
export const startOfDay = ts => { const { year, month, day } = madridParts(ts); return madridTime(year, month, day); };

/** Las 23:59 del día de `ts` en España (como un plazo sin hora). */
export const endOfDay = ts => { const { year, month, day } = madridParts(ts); return madridTime(year, month, day, 23, 59); };

const pad = n => String(n).padStart(2, "0");
/** «2026-11-24»: el día de `ts` en España. */
export const dayKey = ts => { const { year, month, day } = madridParts(ts); return `${year}-${pad(month)}-${pad(day)}`; };
/** «2026-11»: el mes de `ts` en España. */
export const monthKey = ts => dayKey(ts).slice(0, 7);
/** Las 0:00 del día 1 del mes de `ts` en España. */
export const startOfMonth = ts => { const { year, month } = madridParts(ts); return madridTime(year, month, 1); };

/** «2 de diciembre» (al acabar el día) o «2 de diciembre a las 18:00», para los avisos. */
export function fmtWhen(ts) {
  const d = new Date(ts);
  const day = d.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: MADRID });
  const { hour, minute } = madridParts(ts);
  if (hour === 23 && minute === 59) return day;
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: MADRID });
  return `${day} a las ${time}`;
}
