// Medir el uso (docs/plan-hasta-premium.md, «Qué se mide»): totales anónimos por día y por mes en `stats/{día}` y
// `stats/{mes}`. Los calcula onDaily (index.js) cada noche a partir de lo que ya hay guardado (votaciones, votos,
// mensajes, denuncias y cuentas), sin guardar nada nuevo de cada persona, sin analítica ni cookies. Lo único que manda
// la app son los `pings` (exportar, compartir la imagen, duplicar): el qué y la hora, sin quién; aquí se suman y se
// borran. Solo lo lee el servidor; se mira en la consola de Firebase.
import { Timestamp } from "firebase-admin/firestore";
import { paidSettings } from "./plan.js";
import { dayKey, monthKey, startOfDay, startOfMonth } from "./time.js";

/** Correo ficticio de las cuentas con clave de acceso (app/src/lib/store/accessKey.ts): cuentan como sin registro. */
const KEY_EMAIL = /@clave\.hilemos\.web\.app$/;

// ---------- Funciones puras ----------

/** Quién organiza una votación: quien la creó, aunque ya se haya ido (`founder`). */
export const organizerOf = p => p.founder || p.ownerUid;

/** Resumen de las votaciones creadas en un periodo: cuántas, de qué tipo, cuántas personas distintas las organizan y
 *  cuántas usan cada función de pago (y alguna). */
export function summarizePolls(polls) {
  const byType = {};
  const features = { deadline: 0, approval: 0, emails: 0, admins: 0, people: 0 };
  let premium = 0;
  for (const p of polls) {
    byType[p.type] = (byType[p.type] || 0) + 1;
    if (p.deadline) features.deadline++;
    if (p.approval) features.approval++;
    if (p.emailsOnly) features.emails++;
    if ((p.admins || []).length) features.admins++;
    if ((p.members || 0) > 20) features.people++;
    if (paidSettings(p)) premium++;
  }
  return { polls: polls.length, byType, features, withPremium: premium, organizers: new Set(polls.map(organizerOf)).size };
}

/** Los votos de las votaciones (`polls/{id}/votes/{uid}`), sin la colección `votes` de la raíz (la votación de Navidad). */
export const pollVotes = docs => docs.filter(d => d.ref.parent.parent);

/** Cuántas cuentas se crearon en [start, end): con registro (Google o correo) y sin él (anónimas o con clave). */
export function countAccounts(users, start, end) {
  const out = { registered: 0, anonymous: 0 };
  for (const u of users) {
    const at = Date.parse(u.metadata.creationTime);
    if (!(at >= start && at < end)) continue;
    const anon = !u.providerData.length || KEY_EMAIL.test(u.email || "");
    out[anon ? "anonymous" : "registered"]++;
  }
  return out;
}

// ---------- Con Firestore ----------

const range = (q, field, start, end) => q.where(field, ">=", start).where(field, "<", end);
const pollsCreated = (db, start, end) => range(db.collection("polls"), "createdAt", start, end).get()
  .then(s => s.docs.map(d => d.data()));
const countGroup = async (db, group, field, start, end) =>
  (await range(db.collectionGroup(group), field, start, end).count().get()).data().count;

/** Todas las cuentas (de 1000 en 1000). A esta escala basta; con muchas, habría que guardar el total por día. */
async function allUsers(auth) {
  const out = [];
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    out.push(...page.users);
    token = page.pageToken;
  } while (token);
  return out;
}

/**
 * Las estadísticas del día anterior (en hora de España) y, el día 1, las del mes anterior. Se pueden repetir sin
 * contar dos veces: se vuelven a calcular y se sobrescriben (salvo los pings, que se borran al sumarlos).
 */
export async function dailyStats(db, auth, now) {
  const end = startOfDay(now);
  const start = startOfDay(end - 1);
  const [polls, votes, joins, chat, reports, personReports, users, pings] = await Promise.all([
    pollsCreated(db, start, end),
    range(db.collectionGroup("votes"), "updatedAt", start, end).select().get().then(s => pollVotes(s.docs)),
    countGroup(db, "votes", "joinedAt", start, end),
    countGroup(db, "chat", "at", start, end),
    countGroup(db, "reports", "at", start, end),
    countGroup(db, "personReports", "at", start, end),
    allUsers(auth),
    db.collection("pings").where("at", "<", Timestamp.fromMillis(end)).get(),
  ]);
  const clicks = {};
  for (const d of pings.docs) {
    const at = d.get("at")?.toMillis?.() || 0;
    if (at >= start) clicks[d.get("f")] = (clicks[d.get("f")] || 0) + 1;
  }
  await db.doc(`stats/${dayKey(start)}`).set({
    day: dayKey(start),
    ...summarizePolls(polls),
    // Personas que votaron o cambiaron su voto ese día, y cuántos votos se tocaron.
    voters: new Set(votes.map(d => d.id)).size,
    votes: votes.length,
    joins, chat, reports: reports + personReports,
    accounts: countAccounts(users, start, end),
    totalAccounts: users.length,
    ...(Object.keys(clicks).length ? { clicks } : {}),
    computedAt: now,
  }, { merge: true });
  // Los pings ya sumados (y los de días anteriores que se quedaran) se borran: no hacen falta para nada más.
  for (let i = 0; i < pings.docs.length; i += 450) {
    const b = db.batch();
    pings.docs.slice(i, i + 450).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  if (dayKey(end).endsWith("-01")) await monthlyStats(db, end);
}

/**
 * El mes que acaba en `end`: votaciones, personas distintas que organizan y que votan, y cuántas de las que
 * organizaron el mes anterior han vuelto a organizar (las señales de la fase 3).
 */
async function monthlyStats(db, end) {
  const start = startOfMonth(end - 1);
  const prevStart = startOfMonth(start - 1);
  const [polls, prevPolls, votes] = await Promise.all([
    pollsCreated(db, start, end),
    pollsCreated(db, prevStart, start),
    range(db.collectionGroup("votes"), "updatedAt", start, end).select().get().then(s => pollVotes(s.docs)),
  ]);
  const organizers = new Set(polls.map(organizerOf));
  const prevOrganizers = new Set(prevPolls.map(organizerOf));
  const summary = summarizePolls(polls);
  await db.doc(`stats/${monthKey(start)}`).set({
    month: monthKey(start),
    ...summary,
    premiumShare: summary.polls ? Math.round((summary.withPremium / summary.polls) * 100) : 0,
    // Aproximado: un voto cambiado ya este mes cuenta en este, no en el anterior.
    voters: new Set(votes.map(d => d.id)).size,
    returning: [...organizers].filter(u => prevOrganizers.has(u)).length,
    computedAt: Date.now(),
  });
}
