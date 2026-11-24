// Premium en el servidor: el límite de votaciones abiertas a la vez, la herencia con preferencia por quien tiene sitio
// y las cuentas atrás que cierran solas las votaciones (docs/funcionalidades-y-planes.md, §8 y §9).
//
// Todo está APAGADO mientras `config/plan.freeForAll` no sea false (el lanzamiento gratis): entonces solo se apunta
// `ownerSince` al cambiar de manos y se quitan las cuentas atrás que hubiera. Lo que solo escribe el servidor (las
// reglas no dejan a la app): `plans/{uid}.premiumUntil` y, en `polls/{id}`, `ownerSince`, `autoCloseAt`,
// `autoCloseWhy`, `autoCloseWarned` y `autoClosedAt`.
//
// La primera parte son funciones puras (se prueban con `npm test` en functions/); la segunda lee Firestore.
import { FieldValue } from "firebase-admin/firestore";

/** Igual que FREE_OPEN, FREE_PEOPLE en app/src/lib/model.ts: si cambian, en los dos sitios. */
export const FREE_OPEN = 3;
export const PREMIUM_OPEN = 50;
export const FREE_PEOPLE = 20;

export const DAY = 86400000;
/** Heredar por encima del límite (§8): se cierra a los 7 días. */
export const INHERIT_GRACE = 7 * DAY;
/** Sobrar sin herencia (se acabó premium, o al estrenar el límite) o usar funciones de pago sin premium: 30 días. */
export const GRACE = 30 * DAY;

// ---------- Funciones puras ----------

/** Abierta: sin cerrar y sin el plazo pasado (lo mismo que cuenta la app en openManaged). */
export const isOpen = (p, now) => !p.closed && !(p.deadline && now >= p.deadline);

/** Usa algo de pago (lo mismo que hasPremiumSettings en model.ts): plazo, aprobación, correos, administradores o más de 20. */
export const paidSettings = p =>
  !!p.deadline || !!p.approval || !!p.emailsOnly || !!(p.admins || []).length || (p.members || 0) > FREE_PEOPLE;

/** Cuántas abiertas puede gestionar a la vez. */
export const openLimit = premium => (premium ? PREMIUM_OPEN : FREE_OPEN);

/** Desde cuándo la gestiona quien la gestiona ahora: al heredarla, ownerSince; si no, cuando se creó. */
export const managedSince = p => p.ownerSince || p.createdAt || 0;

/**
 * Las que sobran (§8, «Heredar por encima del límite»): de las abiertas de una persona, las últimas en llegar a sus
 * manos por encima de `limit`. Quien cierra una elige cuáles se quedan; si no hace nada, se quedan las primeras.
 * `polls`: [{ id, ...datos }]. Devuelve un Set de ids.
 */
export function extrasOf(polls, limit) {
  const sorted = [...polls].sort((a, b) => managedSince(a) - managedSince(b) || (a.id < b.id ? -1 : 1));
  return new Set(sorted.slice(limit).map(p => p.id));
}

const MADRID = "Europe/Madrid";
/** Año, mes y día (y hora) de `ts` en hora de España. */
function madridParts(ts) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  return Object.fromEntries(f.formatToParts(new Date(ts)).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
}

/**
 * Las 23:59 del día de `ts` en hora de España. Las cuentas atrás acaban al final de un día, como un plazo sin hora:
 * así «Último día» en la app quiere decir que al día siguiente ya está cerrada.
 */
export function endOfDay(ts) {
  const { year, month, day } = madridParts(ts);
  const wall = Date.UTC(year, month - 1, day, 23, 59);
  // Lo que España va por delante de UTC a esa hora (1 o 2 horas; los cambios de hora son de madrugada).
  const p = madridParts(wall);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - wall;
  return wall - offset;
}

/**
 * Las cuentas atrás que le tocan a una votación abierta. `why` es la que tiene ({ limit?, premium? }: cuándo se
 * cierra por cada motivo); una que ya corre conserva su fecha (no vuelve a empezar). `extraGrace`: 7 días si sobra por
 * una herencia, 30 si no. Acaban al final de ese día (endOfDay).
 */
export function nextWhy(why = {}, { extra, paid, premium, now, extraGrace = GRACE }) {
  const out = {};
  if (extra) out.limit = why.limit || endOfDay(now + extraGrace);
  if (paid && !premium) out.premium = why.premium || endOfDay(now + GRACE);
  return out;
}

/** Cuándo se cierra: la primera de sus cuentas atrás (0 si no tiene ninguna). */
export function closeAtOf(why) {
  const dates = Object.values(why || {});
  return dates.length ? Math.min(...dates) : 0;
}

/** Motivos que no tenía y ahora sí (para avisar solo de lo nuevo). */
export const addedReasons = (before = {}, after = {}) => Object.keys(after).filter(k => !before[k]);

const sameWhy = (a = {}, b = {}) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => a[k] === b[k]);
};

/** Lo que hay que escribir para dejar las cuentas atrás en `why` (null si no cambia nada). */
export function countdownPatch(poll, why) {
  if (sameWhy(poll.autoCloseWhy || {}, why)) return null;
  const at = closeAtOf(why);
  if (!at) return CLEAR_COUNTDOWN;
  return {
    autoCloseAt: at,
    autoCloseWhy: why,
    // El aviso de «mañana se cierra» es para una fecha: si cambia, se vuelve a avisar.
    ...(at !== poll.autoCloseAt ? { autoCloseWarned: FieldValue.delete() } : {}),
  };
}

/** Quita todas las cuentas atrás. */
export const CLEAR_COUNTDOWN = {
  autoCloseAt: FieldValue.delete(), autoCloseWhy: FieldValue.delete(), autoCloseWarned: FieldValue.delete(),
};

const shuffle = list => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Otro heredero con sitio cuando el elegido no lo tiene (§8, «Quién hereda»): un administrador con premium, uno con
 * sitio y, si no, cualquier participante con premium o con sitio; al azar dentro de cada grupo. `room(uid)` dice si
 * le cabe una abierta más y si tiene premium ({ fits, premium }). null si nadie tiene sitio.
 */
export async function betterHeir({ admins, others }, room) {
  const checked = await Promise.all(admins.map(async uid => ({ uid, ...(await room(uid)) })));
  const fit = checked.filter(c => c.fits);
  const pick = fit.filter(c => c.premium).length ? fit.filter(c => c.premium) : fit;
  if (pick.length) return shuffle(pick)[0].uid;
  // Participantes: de uno en uno, para no leer los planes de 150 personas si el primero ya vale.
  for (const uid of shuffle(others)) if ((await room(uid)).fits) return uid;
  return null;
}

/** «2 de diciembre» (al acabar el día, como las cuentas atrás) o «2 de diciembre a las 18:00», en hora de España. */
export function fmtWhen(ts) {
  const d = new Date(ts);
  const day = d.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: MADRID });
  const { hour, minute } = madridParts(ts);
  if (hour === 23 && minute === 59) return day;
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: MADRID });
  return `${day} a las ${time}`;
}

/** Texto del aviso de una cuenta atrás nueva, según el motivo. */
export function countdownText(reason, at, { inherited = false } = {}) {
  const when = fmtWhen(at);
  if (reason === "limit") {
    return inherited
      ? `La has heredado y ya tienes más de ${FREE_OPEN} votaciones abiertas: se cerrará sola el ${when}. Cierra otra para mantenerla abierta.`
      : `Tienes más de ${FREE_OPEN} votaciones abiertas sin premium: esta se cerrará sola el ${when}. Cierra otra o pásate a premium para mantenerla abierta.`;
  }
  return `Usa funciones premium y quien la gestiona ya no tiene premium: se cerrará sola el ${when}. Con premium sigue abierta.`;
}

// ---------- Con Firestore ----------

/** Lanzamiento gratis: mientras `config/plan.freeForAll` no sea false (y si el documento no existe), todo es gratis. */
export async function freeForAll(db) {
  return (await db.doc("config/plan").get()).get("freeForAll") !== false;
}

/** Tiene premium ahora: `plans/{uid}.premiumUntil` (lo escribe solo el servidor al comprobar un pago) es futuro. */
export async function hasPremium(db, uid, now) {
  return ((await db.doc(`plans/${uid}`).get()).get("premiumUntil") || 0) > now;
}

/** Sus votaciones abiertas (las que gestiona). Una consulta: no hace falta ningún contador que se pueda descuadrar. */
export async function openPollsOf(db, uid, now) {
  const s = await db.collection("polls").where("ownerUid", "==", uid).where("closed", "==", false).get();
  return s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => isOpen(p, now));
}
