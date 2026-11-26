// Cloud Functions de Hilemos: avisos (FCM) cuando pasa algo en una votación, premium (herencia y cuentas atrás, con
// la lógica en plan.js) y aviso de las denuncias a quien modera.
// - Navegador: mensajes solo de datos; el aviso lo compone app/public/firebase-messaging-sw.js.
// - App de Android (token con platform "android"): con bloque «notification», para que Android lo pinte aunque la
//   app esté cerrada, en el canal «avisos» (ver app/src/lib/push.ts y el AndroidManifest.xml).
// Los dispositivos están en users/{uid}/tokens/{token} y las preferencias en users/{uid}.notify.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAuth } from "firebase-admin/auth";
import {
  CLEAR_COUNTDOWN, INHERIT_GRACE, addedReasons, betterHeir, countdownPatch, countdownText, extrasOf, freeForAll,
  hasPremium, isOpen, nextWhy, openLimit, openPollsOf, paidSettings,
} from "./plan.js";
import { dailyStats } from "./stats.js";
import { DAY, fmtWhen } from "./time.js";
import { reportMail } from "./reportMail.js";

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "europe-west1", maxInstances: 5 });

const SITE = "https://hilemos.web.app";
const pollUrl = id => `${SITE}/#/v/${id}`;
const DEAD_TOKEN = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
const DEADLINE_EVERY_MIN = 15;
const ANDROID_CHANNEL = "avisos";

/** Manda el aviso a los dispositivos de `uids` que no hayan apagado ese tipo (`pref`) y limpia los caducados. */
async function notify(uids, { title, body, url, tag }, pref) {
  const targets = [];
  await Promise.all([...new Set(uids)].filter(Boolean).map(async uid => {
    const [profile, tokens] = await Promise.all([db.doc(`users/${uid}`).get(), db.collection(`users/${uid}/tokens`).get()]);
    if (profile.get(`notify.${pref}`) === false) return;
    tokens.forEach(t => targets.push({ uid, token: t.id, android: t.get("platform") === "android" }));
  }));
  const data = { title: String(title), body: String(body), url: String(url), tag: String(tag) };
  const web = { data, webpush: { headers: { TTL: "86400", Urgency: "normal" } } };
  const android = {
    data,
    notification: { title: data.title, body: data.body },
    android: { ttl: 86400000, notification: { channelId: ANDROID_CHANNEL, tag: data.tag } },
  };
  for (const [kind, list] of [[web, targets.filter(t => !t.android)], [android, targets.filter(t => t.android)]]) {
    for (let i = 0; i < list.length; i += 500) {
      const batch = list.slice(i, i + 500);
      const res = await getMessaging().sendEachForMulticast({ ...kind, tokens: batch.map(t => t.token) });
      await Promise.all(res.responses.map((r, k) => (!r.success && DEAD_TOKEN.has(r.error?.code)
        ? db.doc(`users/${batch[k].uid}/tokens/${batch[k].token}`).delete()
        : null)));
    }
  }
}

/** Cuántas opciones quedaron en cabeza en el desempate `tb` (1 = hay ganadora; 0 = nadie votó). */
async function tiebreakWinners(pollId, tb) {
  const s = await db.collection(`polls/${pollId}/votes`).get();
  const counts = Object.fromEntries((tb.candidates || []).map(c => [c, 0]));
  s.docs.forEach(d => {
    const v = d.get("tb");
    if (!d.get("status") && v && v.id === tb.id && v.pick in counts) counts[v.pick]++;
  });
  const max = Math.max(0, ...Object.values(counts));
  return max ? Object.values(counts).filter(n => n === max).length : 0;
}

/** Participantes aceptados (quien está pendiente o rechazado no recibe avisos de la votación, ni quien se fue). */
async function participants(pollId) {
  const s = await db.collection(`polls/${pollId}/votes`).get();
  return s.docs.filter(d => !d.get("status") && !d.get("gone")).map(d => d.id);
}

// Alguien pide entrar, le aceptan (o readmiten) o vota por primera vez. Solo la primera vez: cada casilla que se
// pulsa guarda el voto, y avisar en cada cambio sería un aviso por clic. «Primera vez» cuenta desde que entró o,
// si le expulsaron y le readmitieron (o le aceptaron), desde entonces: joinedAt es ese momento y updatedAt, el del
// último voto guardado.
export const onVoteWritten = onDocumentWritten("polls/{pollId}/votes/{uid}", async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after) return;
  // Antes de leer nada: cada casilla que se pulsa dispara esta función, y casi nunca hay que avisar.
  const requested = !before && after.status === "pending";
  // Aceptado tras pedir entrar, o readmitido tras un rechazo o una expulsión.
  const accepted = (before?.status === "pending" || before?.status === "rejected") && !after.status;
  const hasPicks = (after.picks || []).length > 0 && !after.status;
  const firstVote = hasPicks && (!(before?.picks || []).length
    // Primer voto desde que volvió: el anterior era de antes de la readmisión y este, de después.
    || (!!after.joinedAt && (before?.updatedAt || 0) < after.joinedAt && (after.updatedAt || 0) >= after.joinedAt));
  if (!requested && !accepted && !firstVote) return;
  const { pollId, uid } = event.params;
  const poll = (await db.doc(`polls/${pollId}`).get()).data();
  if (!poll) return;
  const msg = { title: poll.title || "Votación", url: pollUrl(pollId) };
  const name = after.name || "Alguien";

  // A todos los que pueden aceptarle: el creador y los administradores.
  if (requested && uid !== poll.ownerUid) {
    const admins = [poll.ownerUid, ...(poll.admins || [])];
    return notify(admins, { ...msg, body: `${name} quiere entrar en la votación`, tag: `members-${pollId}` }, "members");
  }
  if (accepted) {
    const body = before.removed ? "Te han vuelto a admitir: ya puedes votar" : "Te han aceptado: ya puedes votar";
    return notify([uid], { ...msg, body, tag: `members-${pollId}` }, "members");
  }
  // El primer voto de alguien: a todos los que están en la votación (y al creador), menos a quien ha votado.
  if (firstVote) {
    const uids = [poll.ownerUid, ...(await participants(pollId))].filter(u => u !== uid);
    return notify(uids, { ...msg, body: `${name} ha votado`, tag: `votes-${pollId}` }, "votes");
  }
});

// Mensaje nuevo en el chat: apunta en la votación la hora del último mensaje (chatAt) y quién lo escribió (chatBy),
// para el icono de mensajes sin leer de «Mis votaciones» (lo tuyo no cuenta). Lo hace el servidor y no la app para que
// funcione con cualquier versión (también las de Android que aún no lo saben). Una escritura por mensaje y ninguna
// lectura; sin avisos push del chat.
export const onChatMessage = onDocumentCreated("polls/{pollId}/chat/{msgId}", async event => {
  const at = event.data?.get("at");
  if (typeof at !== "number") return;
  await db.doc(`polls/${event.params.pollId}`).update({ chatAt: at, chatBy: String(event.data.get("uid") || "") })
    .catch(() => { /* la votación ya no existe */ });
});

// Cambios de estado de la votación que interesan a todos los participantes (menos a quien los hace: el creador).
// Si la ha cerrado el servidor (una cuenta atrás, ver onAutoClose), se avisa también a quien la gestiona.
export const onPollUpdated = onDocumentUpdated("polls/{pollId}", async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  const { pollId } = event.params;
  const autoClosed = !!after.autoClosedAt && after.autoClosedAt !== before.autoClosedAt;
  let body = "";
  if (after.tiebreak && !after.tiebreak.done && before.tiebreak?.id !== after.tiebreak.id) body = "Hay un desempate: elige una de las empatadas";
  else if (before.tiebreak && !before.tiebreak.done && after.tiebreak?.done) {
    // Finalizar el desempate con una ganadora deja el resultado definitivo (no se reabre).
    body = (await tiebreakWinners(pollId, after.tiebreak)) === 1
      ? "Ya hay resultado definitivo: mira la opción ganadora"
      : "El desempate ha terminado sin ganadora";
  }
  else if (!before.closed && after.closed) {
    body = autoClosed ? "Se ha cerrado sola: mira el resultado" : "Se ha cerrado la votación: mira el resultado";
  }
  else if (before.closed && !after.closed) body = "Se ha vuelto a abrir: puedes cambiar tu voto";
  if (!body) return;
  const uids = (await participants(pollId)).filter(u => autoClosed || u !== after.ownerUid);
  return notify(uids, { title: after.title || "Votación", body, url: pollUrl(pollId), tag: `state-${pollId}` }, "state");
});

// El plazo para votar no cambia ningún documento al cumplirse, así que hace falta una función programada.
// La ventana es algo mayor que el intervalo para no perder ninguno; si uno cae dos veces, el `tag` hace que
// el segundo aviso sustituya al primero en el dispositivo.
export const onDeadline = onSchedule({ schedule: `every ${DEADLINE_EVERY_MIN} minutes`, timeZone: "Europe/Madrid" }, async () => {
  const now = Date.now();
  const s = await db.collection("polls")
    .where("deadline", ">", now - (DEADLINE_EVERY_MIN + 5) * 60000)
    .where("deadline", "<=", now)
    .get();
  await Promise.all(s.docs.filter(d => !d.get("closed")).map(async d => notify(await participants(d.id), {
    title: d.get("title") || "Votación",
    body: "Se ha acabado el plazo: mira el resultado",
    url: pollUrl(d.id),
    tag: `state-${d.id}`,
  }, "state")));
});

// ---------- Premium: herencia y cuentas atrás (functions/plan.js; apagado durante el lanzamiento gratis) ----------

/** Participantes aceptados que siguen en la votación, con sus datos (uid → voto). */
async function acceptedMembers(pollId) {
  const s = await db.collection(`polls/${pollId}/votes`).get();
  return Object.fromEntries(s.docs.filter(d => !d.get("status") && !d.get("gone")).map(d => [d.id, d.data()]));
}

/** Avisa a quien gestiona `poll` de una cuenta atrás nueva. */
const notifyCountdown = (uid, pollId, poll, body) =>
  notify([uid], { title: poll.title || "Votación", body, url: pollUrl(pollId), tag: `close-${pollId}` }, "state");

// La votación cambia de manos (su gestor sale o elimina su cuenta) o se cierra a mano.
// - Siempre se apunta `ownerSince` (desde cuándo la gestiona): ordena qué votaciones «sobran» (extrasOf).
// - Con premium encendido (§8): si el heredero no tiene sitio, se busca otro que lo tenga; si nadie, la hereda él y
//   se cierra sola a los 7 días (sin volver a empezar si ya corría). Si tiene sitio, se le quita esa cuenta atrás.
// - Cerrada a mano con una cuenta atrás: se quita, para que al reabrirla no se cierre sola al momento.
// Las escrituras del propio servidor vuelven a disparar esta función, pero sin cambio de manos no hacen nada.
export const onPollPlan = onDocumentUpdated("polls/{pollId}", async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  const ref = event.data.after.ref;
  const { pollId } = event.params;
  if (!before.closed && after.closed && after.autoCloseAt && after.autoClosedAt === before.autoClosedAt) {
    return ref.update(CLEAR_COUNTDOWN);
  }
  if (before.ownerUid === after.ownerUid) return;
  const now = Date.now();
  if ((await freeForAll(db)) || !isOpen(after, now)) return ref.update({ ownerSince: now });

  const heir = after.ownerUid;
  /** Si a `uid` le cabe esta votación (sin contarla) y si tiene premium. */
  const room = async uid => {
    const [premium, open] = await Promise.all([hasPremium(db, uid, now), openPollsOf(db, uid, now)]);
    return { premium, fits: open.filter(p => p.id !== pollId).length < openLimit(premium) };
  };
  const mine = await room(heir);
  if (!mine.fits) {
    const members = await acceptedMembers(pollId);
    const adminsBefore = before.admins || [];
    const cands = Object.keys(members).filter(u => u !== heir && u !== before.ownerUid);
    const other = await betterHeir({
      admins: cands.filter(u => adminsBefore.includes(u)),
      others: cands.filter(u => !adminsBefore.includes(u)),
    }, room);
    if (other) {
      // La hereda quien tiene sitio; el primer elegido vuelve a ser administrador si lo era.
      const admins = [...new Set([
        ...(after.admins || []).filter(a => a !== other),
        ...(adminsBefore.includes(heir) ? [heir] : []),
      ])];
      return ref.update({ ownerUid: other, ownerName: members[other].name || "Alguien", admins });
    }
  }
  // Recién heredada, es la última en llegar a sus manos: sobra si no le cabía.
  const why = nextWhy(after.autoCloseWhy, {
    extra: !mine.fits, paid: paidSettings(after), premium: mine.premium, now, extraGrace: INHERIT_GRACE,
  });
  await ref.update({ ownerSince: now, ...(countdownPatch(after, why) || {}) });
  const added = addedReasons(after.autoCloseWhy, why);
  if (added.length) await notifyCountdown(heir, pollId, after, countdownText(added[0], why[added[0]], { inherited: true }));
});

// Cada hora: cierra las votaciones cuya cuenta atrás ha llegado al final y avisa a quien las gestiona el día antes.
// Con el lanzamiento gratis, o si la votación ya no está abierta, solo quita la cuenta atrás.
export const onAutoClose = onSchedule({ schedule: "every 60 minutes", timeZone: "Europe/Madrid" }, async () => {
  const now = Date.now();
  const s = await db.collection("polls").where("autoCloseAt", "<=", now + DAY).get();
  if (s.empty) return;
  const free = await freeForAll(db);
  await Promise.all(s.docs.map(async d => {
    const p = d.data();
    if (free || !isOpen(p, now)) return d.ref.update(CLEAR_COUNTDOWN);
    if (p.autoCloseAt <= now) return d.ref.update({ closed: true, autoClosedAt: now, ...CLEAR_COUNTDOWN });
    if (p.autoCloseWarned === p.autoCloseAt) return;
    await d.ref.update({ autoCloseWarned: p.autoCloseAt });
    const fix = p.autoCloseWhy?.limit === p.autoCloseAt
      ? "Cierra otra votación para mantenerla abierta."
      : "Con premium sigue abierta.";
    await notifyCountdown(p.ownerUid, d.id, p, `Es su último día: se cerrará sola al acabar el ${fmtWhen(p.autoCloseAt)}. ${fix}`);
  }));
});

// Cada día a las 4:00: el barrido de premium y las estadísticas del día anterior. Van en la misma tarea programada
// porque Cloud Scheduler da 3 gratis y ya están las otras dos (onDeadline y onAutoClose). Si una falla, la otra sigue.
export const onDaily = onSchedule({ schedule: "every day 04:00", timeZone: "Europe/Madrid" }, async () => {
  const now = Date.now();
  const results = await Promise.allSettled([planSweep(now), dailyStats(db, getAuth(), now)]);
  results.forEach(r => { if (r.status === "rejected") console.error("onDaily", r.reason); });
});

// Pone o quita las cuentas atrás de todas las votaciones abiertas (§8 y §9), por si alguien ha perdido o recuperado
// premium, ha cerrado otras o ha empezado el límite. Sobran las que pasan del límite (las últimas en llegar a sus
// manos) y las que usan funciones de pago sin premium: 30 días. Con el lanzamiento gratis, las quita.
// Lee todas las abiertas una vez al día: a esta escala, unas pocas miles de lecturas.
async function planSweep(now) {
  if (await freeForAll(db)) {
    const s = await db.collection("polls").where("autoCloseAt", ">", 0).get();
    await Promise.all(s.docs.map(d => d.ref.update(CLEAR_COUNTDOWN)));
    return;
  }
  const s = await db.collection("polls").where("closed", "==", false).get();
  const byOwner = new Map();
  for (const d of s.docs) {
    const p = { id: d.id, ...d.data() };
    if (!isOpen(p, now)) continue;
    byOwner.set(p.ownerUid, [...(byOwner.get(p.ownerUid) || []), { p, ref: d.ref }]);
  }
  for (const [uid, list] of byOwner) {
    const premium = await hasPremium(db, uid, now);
    const extras = extrasOf(list.map(x => x.p), openLimit(premium));
    const news = [];
    for (const { p, ref } of list) {
      const why = nextWhy(p.autoCloseWhy, { extra: extras.has(p.id), paid: paidSettings(p), premium, now });
      const patch = countdownPatch(p, why);
      if (!patch) continue;
      await ref.update(patch);
      const added = addedReasons(p.autoCloseWhy, why);
      if (added.length) news.push({ p, reason: added[0], at: why[added[0]] });
    }
    // Un aviso por votación; si son varias, uno solo que lleva a «Mis votaciones».
    if (news.length === 1) await notifyCountdown(uid, news[0].p.id, news[0].p, countdownText(news[0].reason, news[0].at));
    else if (news.length > 1) {
      await notify([uid], {
        title: "Hilemos",
        body: `${news.length} de tus votaciones abiertas se cerrarán solas a partir del ${fmtWhen(Math.min(...news.map(n => n.at)))}. Mira en cada una por qué y cómo mantenerla abierta.`,
        url: `${SITE}/`, tag: `close-${uid}`,
      }, "state");
    }
  }
}

// ---------- Moderación ----------

const REASONS = {
  ofensivo: "Insultos, acoso u ofensas",
  spam: "Spam o publicidad",
  inapropiado: "Contenido inapropiado o peligroso",
  otro: "Otro motivo",
};
const CONSOLE = "https://console.firebase.google.com/project/votaciones-9bc95/firestore/data";

/** Correo con Brevo (su API, sin dependencias). `from` tiene que ser un remitente verificado en Brevo. */
async function sendMail(key, from, to, subject, { html, text }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Hilemos", email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
  });
  if (!res.ok) console.error("No se pudo mandar el correo de la denuncia", res.status, await res.text());
  else console.log("Correo de la denuncia aceptado por Brevo para", to);
}

/** Dominio del correo interno de las cuentas con clave de acceso (app/src/lib/store/accessKey.ts): no es un correo. */
const KEY_DOMAIN = "@clave.hilemos.web.app";

/**
 * Correo y tipo de cuenta de alguien, para el correo de la denuncia: de la cuenta de inicio de sesión de Firebase. Las
 * cuentas sin registro (anónimas o con clave de acceso) no tienen correo de verdad.
 */
async function accountOf(uid) {
  try {
    const u = await getAuth().getUser(uid);
    const google = u.providerData.find(p => p.providerId === "google.com");
    const email = (google?.email || u.email || "").toLowerCase();
    if (google) return { email, account: "Cuenta de Google" };
    if (email && !email.endsWith(KEY_DOMAIN)) return { email, account: "Cuenta con correo" };
    return { email: "", account: "Sin registro (clave de acceso)" };
  } catch {
    return { email: "", account: "Cuenta eliminada o no encontrada" };
  }
}

// Denuncias (de un mensaje del chat o de una persona): se avisa a quien modera Hilemos. Lo que hay que avisar se
// configura en config/moderation (solo lo lee el servidor): `uids` (avisos push a esas cuentas), `email` y `brevoKey`
// (un correo con la denuncia, ver reportMail.js). Sin configurar, la denuncia queda guardada y se ve en la consola.
// Los asuntos de los correos empiezan siempre por «[Hilemos] Denuncia», para poder filtrarlos en el correo.
async function alertModerators({ pollId, path, push, subject, mail }) {
  const [poll, cfg] = await Promise.all([db.doc(`polls/${pollId}`).get(), db.doc("config/moderation").get()]);
  const title = poll.get("title") || "Votación";
  const tasks = [];
  const uids = cfg.get("uids") || [];
  if (uids.length) {
    tasks.push(notify(uids, { title: push, body: `«${title}»: ${subject}`, url: pollUrl(pollId), tag: `report-${pollId}` }, "reports"));
  }
  const email = typeof cfg.get("email") === "string" ? cfg.get("email").trim() : "";
  const key = typeof cfg.get("brevoKey") === "string" ? cfg.get("brevoKey").trim() : "";
  // Qué hay en la configuración (sin la clave), para saber en el registro por qué no llega un aviso.
  console.log("Denuncia recibida", path, {
    configExiste: cfg.exists, campos: cfg.exists ? Object.keys(cfg.data()) : [], email: email || null,
    // El principio de la clave dice de qué tipo es (no es secreto): la de API empieza por «xkeysib-»; la SMTP
    // («xsmtpsib-») no sirve para la API y Brevo responde «Key not found».
    brevoKey: key ? `${key.length} caracteres, tipo ${key.startsWith("xkeysib-") ? "API (correcta)" : key.startsWith("xsmtpsib-") ? "SMTP (no sirve: hace falta la de API)" : "desconocido"}` : null,
    uids: uids.length,
  });
  if (email && key) {
    const consoleUrl = `${CONSOLE}/~2F${path.split("/").map(encodeURIComponent).join("~2F")}`;
    const content = await mail({ pollTitle: title, pollUrl: pollUrl(pollId), consoleUrl });
    tasks.push(sendMail(key, email, email, `[Hilemos] Denuncia en «${title}»: ${subject}`, content));
  }
  if (!tasks.length) console.warn("Denuncia sin moderación configurada (config/moderation)", path);
  await Promise.all(tasks);
}

/** Las dos personas de una denuncia, con su correo y su tipo de cuenta. */
async function reportPeople(reported, reporter) {
  const [a, b] = await Promise.all([accountOf(reported.uid), accountOf(reporter.uid)]);
  return { reported: { ...reported, ...a }, reporter: { ...reporter, ...b } };
}

export const onReport = onDocumentCreated("polls/{pollId}/reports/{reportId}", async event => {
  const r = event.data?.data();
  if (!r) return;
  const reason = REASONS[r.reason] || r.reason;
  await alertModerators({
    pollId: event.params.pollId, path: event.data.ref.path, push: "Denuncia en el chat", subject: reason,
    mail: async base => reportMail({
      ...base, kind: "message", reason, comment: r.comment, message: r.msgText, at: r.at,
      ...(await reportPeople({ name: r.msgName, uid: r.msgUid }, { name: r.byName, uid: r.by })),
    }),
  });
});

export const onPersonReport = onDocumentCreated("polls/{pollId}/personReports/{reportId}", async event => {
  const r = event.data?.data();
  if (!r) return;
  const reason = REASONS[r.reason] || r.reason;
  await alertModerators({
    pollId: event.params.pollId, path: event.data.ref.path, push: "Denuncia de una persona", subject: `${r.targetName}, ${reason}`,
    mail: async base => reportMail({
      ...base, kind: "person", reason, comment: r.comment, at: r.at,
      ...(await reportPeople({ name: r.targetName, uid: r.targetUid, photo: r.targetPhoto }, { name: r.byName, uid: r.by })),
    }),
  });
});
