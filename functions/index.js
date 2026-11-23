// Avisos de Votaciones: Cloud Functions que mandan avisos (FCM) cuando pasa algo en una votación.
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

// Alguien pide entrar, le aceptan o vota por primera vez. Solo la primera vez: cada casilla que se
// pulsa guarda el voto, y avisar en cada cambio sería un aviso por clic. «Primera vez» cuenta desde que entró o,
// si le expulsaron y le readmitieron (o le aceptaron), desde entonces: joinedAt es ese momento y updatedAt, el del
// último voto guardado.
export const onVoteWritten = onDocumentWritten("polls/{pollId}/votes/{uid}", async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after) return;
  // Antes de leer nada: cada casilla que se pulsa dispara esta función, y casi nunca hay que avisar.
  const requested = !before && after.status === "pending";
  const accepted = before?.status === "pending" && !after.status;
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

  if (requested && uid !== poll.ownerUid) {
    return notify([poll.ownerUid], { ...msg, body: `${name} quiere entrar en la votación`, tag: `members-${pollId}` }, "members");
  }
  if (accepted) {
    return notify([uid], { ...msg, body: "Te han aceptado: ya puedes votar", tag: `members-${pollId}` }, "members");
  }
  // El primer voto de alguien: a todos los que están en la votación (y al creador), menos a quien ha votado.
  if (firstVote) {
    const uids = [poll.ownerUid, ...(await participants(pollId))].filter(u => u !== uid);
    return notify(uids, { ...msg, body: `${name} ha votado`, tag: `votes-${pollId}` }, "votes");
  }
});

// Cambios de estado de la votación que interesan a todos los participantes (menos a quien los hace: el creador).
export const onPollUpdated = onDocumentUpdated("polls/{pollId}", async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  const { pollId } = event.params;
  let body = "";
  if (after.tiebreak && !after.tiebreak.done && before.tiebreak?.id !== after.tiebreak.id) body = "Hay un desempate: elige una de las empatadas";
  else if (before.tiebreak && !before.tiebreak.done && after.tiebreak?.done) {
    // Finalizar el desempate con una ganadora deja el resultado definitivo (no se reabre).
    body = (await tiebreakWinners(pollId, after.tiebreak)) === 1
      ? "Ya hay resultado definitivo: mira la opción ganadora"
      : "El desempate ha terminado sin ganadora";
  }
  else if (!before.closed && after.closed) body = "Se ha cerrado la votación: mira el resultado";
  else if (before.closed && !after.closed) body = "Se ha vuelto a abrir: puedes cambiar tu voto";
  if (!body) return;
  const uids = (await participants(pollId)).filter(u => u !== after.ownerUid);
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

// ---------- Moderación ----------

const REASONS = {
  ofensivo: "Insultos, acoso u ofensas",
  spam: "Spam o publicidad",
  inapropiado: "Contenido inapropiado o peligroso",
  otro: "Otro motivo",
};
const CONSOLE = "https://console.firebase.google.com/project/votaciones-9bc95/firestore/data";

/** Correo con Brevo (su API, sin dependencias). `from` tiene que ser un remitente verificado en Brevo. */
async function sendMail(key, from, to, subject, text) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Hilemos", email: from }, to: [{ email: to }], subject, textContent: text }),
  });
  if (!res.ok) console.error("No se pudo mandar el correo de la denuncia", res.status, await res.text());
}

// Denuncias (de un mensaje del chat o de una persona): se avisa a quien modera Hilemos. Lo que hay que avisar se
// configura en config/moderation (solo lo lee el servidor): `uids` (avisos push a esas cuentas), `email` y `brevoKey`
// (un correo con la denuncia). Sin configurar, la denuncia queda guardada y se ve en la consola de Firebase.
// Los asuntos de los correos empiezan siempre por «[Hilemos] Denuncia», para poder filtrarlos en el correo.
async function alertModerators({ pollId, path, push, subject, lines }) {
  const [poll, cfg] = await Promise.all([db.doc(`polls/${pollId}`).get(), db.doc("config/moderation").get()]);
  const title = poll.get("title") || "Votación";
  const tasks = [];
  const uids = cfg.get("uids") || [];
  if (uids.length) {
    tasks.push(notify(uids, { title: push, body: `«${title}»: ${subject}`, url: pollUrl(pollId), tag: `report-${pollId}` }, "reports"));
  }
  const email = cfg.get("email");
  const key = cfg.get("brevoKey");
  if (email && key) {
    const text = [
      ...lines(title).filter(l => l !== null),
      "",
      `Votación: ${pollUrl(pollId)}`,
      `Denuncia en la consola: ${CONSOLE}/~2F${path.split("/").map(encodeURIComponent).join("~2F")}`,
    ].join("\n");
    tasks.push(sendMail(key, email, email, `[Hilemos] Denuncia en «${title}»: ${subject}`, text));
  }
  if (!tasks.length) console.warn("Denuncia sin moderación configurada (config/moderation)", path);
  await Promise.all(tasks);
}

export const onReport = onDocumentCreated("polls/{pollId}/reports/{reportId}", async event => {
  const r = event.data?.data();
  if (!r) return;
  const reason = REASONS[r.reason] || r.reason;
  await alertModerators({
    pollId: event.params.pollId, path: event.data.ref.path, push: "Denuncia en el chat", subject: reason,
    lines: title => [
      `Han denunciado un mensaje del chat de «${title}».`,
      "",
      `Motivo: ${reason}`,
      r.comment ? `Comentario: ${r.comment}` : null,
      `Mensaje de ${r.msgName}: «${r.msgText}»`,
      `Lo denuncia: ${r.byName}`,
    ],
  });
});

export const onPersonReport = onDocumentCreated("polls/{pollId}/personReports/{reportId}", async event => {
  const r = event.data?.data();
  if (!r) return;
  const reason = REASONS[r.reason] || r.reason;
  await alertModerators({
    pollId: event.params.pollId, path: event.data.ref.path, push: "Denuncia de una persona", subject: `${r.targetName}, ${reason}`,
    lines: title => [
      `Han denunciado a ${r.targetName} en «${title}».`,
      "",
      `Motivo: ${reason}`,
      r.comment ? `Comentario: ${r.comment}` : null,
      r.targetPhoto ? "Tenía foto de perfil: está copiada en la denuncia (campo targetPhoto)." : "No tenía foto de perfil.",
      `Lo denuncia: ${r.byName}`,
    ],
  });
});
