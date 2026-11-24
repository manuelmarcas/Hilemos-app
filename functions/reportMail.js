// Correo a quien modera Hilemos cuando alguien hace una denuncia (onReport y onPersonReport, en index.js): en HTML con
// los colores de la app (tokens.json, tema claro) y en texto plano para los programas de correo que no lo pintan.
// Los estilos van en línea porque los programas de correo ignoran las hojas de estilo.

const C = {
  bg: "#f6f4f7", card: "#ffffff", soft: "#eeeaef", line: "#e2dde4", ink: "#2a1f27", muted: "#6b5e66",
  brand: "#5e2a59", brandSoft: "#ebdfea", danger: "#b23b3b", dangerSoft: "#f6e7e7",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Una persona de la denuncia: nombre, tipo de cuenta, correo (si tiene) e identificador, para buscarla en la consola
 * (Authentication y Firestore).
 * @param {{ name: string, uid: string, email: string, account: string, photo?: string }} p
 */
function personHtml(label, p) {
  const photo = /^https:\/\//.test(p.photo || "")
    ? `<img src="${esc(p.photo)}" width="40" height="40" alt="" style="border-radius:50%;display:block">`
    : `<div style="width:40px;height:40px;border-radius:50%;background:${C.brandSoft};color:${C.brand};font-weight:700;font-size:18px;line-height:40px;text-align:center">${esc((p.name || "?").trim().charAt(0).toUpperCase())}</div>`;
  return `
    <tr><td valign="top" style="padding:0 0 10px">
      <div style="border:1px solid ${C.line};border-radius:12px;padding:12px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:8px">${esc(label)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="padding-right:10px">${photo}</td>
          <td valign="top" style="font-size:14px;line-height:1.45;color:${C.ink}">
            <strong style="font-size:15px">${esc(p.name)}</strong><br>
            ${p.email ? `<a href="mailto:${esc(p.email)}" style="color:${C.brand}">${esc(p.email)}</a>` : `<span style="color:${C.muted}">Sin correo</span>`}<br>
            <span style="color:${C.muted};font-size:12px">${esc(p.account)}</span>
          </td>
        </tr></table>
        <div style="margin-top:8px;font-family:Consolas,Menlo,monospace;font-size:11px;color:${C.muted};word-break:break-all">uid: ${esc(p.uid)}</div>
      </div>
    </td></tr>`;
}

const personText = (label, p) =>
  `${label}: ${p.name} · ${p.email || "sin correo"} · ${p.account} · uid ${p.uid}`;

/**
 * El correo de una denuncia.
 * @param {object} d
 * @param {"message"|"person"} d.kind
 * @param {string} d.pollTitle
 * @param {string} d.pollUrl
 * @param {string} d.consoleUrl  la denuncia en la consola de Firebase
 * @param {string} d.reason      el motivo, en palabras
 * @param {string} [d.comment]
 * @param {string} [d.message]   el texto del mensaje denunciado (denuncias de mensajes)
 * @param {number} d.at          cuándo se hizo
 * @param {{ name: string, uid: string, email: string, account: string, photo?: string }} d.reported
 * @param {{ name: string, uid: string, email: string, account: string, photo?: string }} d.reporter
 */
export function reportMail(d) {
  const what = d.kind === "message" ? "Mensaje del chat" : "Persona";
  const lead = d.kind === "message"
    ? `Han denunciado un mensaje de <strong>${esc(d.reported.name)}</strong> en el chat de <strong>${esc(d.pollTitle)}</strong>.`
    : `Han denunciado a <strong>${esc(d.reported.name)}</strong> en <strong>${esc(d.pollTitle)}</strong> (por su nombre, su foto o su comportamiento).`;
  const when = new Date(d.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "long", timeStyle: "short" });
  const row = (label, value) => `
    <tr>
      <td valign="top" style="padding:6px 12px 6px 0;width:110px;font-size:13px;color:${C.muted}">${label}</td>
      <td valign="top" style="padding:6px 0;font-size:14px;color:${C.ink};line-height:1.45">${value}</td>
    </tr>`;
  const button = (href, label, solid) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;${solid
      ? `background:${C.brand};color:#ffffff`
      : `background:${C.card};color:${C.brand};border:1px solid ${C.line}`}">${label}</a>`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};font-family:${FONT}">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.card};border-radius:16px;overflow:hidden;border:1px solid ${C.line}">
        <tr><td style="background:${C.brand};padding:16px 22px;color:#ffffff">
          <div style="font-size:13px;opacity:.85">Hilemos · Moderación</div>
          <div style="font-size:20px;font-weight:700;margin-top:2px">Nueva denuncia: ${esc(what.toLowerCase())}</div>
        </td></tr>
        <tr><td style="padding:20px 22px 8px">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:${C.ink}">${lead}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            ${row("Motivo", `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${C.dangerSoft};color:${C.danger};font-weight:700;font-size:13px">${esc(d.reason)}</span>`)}
            ${d.comment ? row("Comentario", `«${esc(d.comment)}»`) : ""}
            ${row("Votación", `<a href="${esc(d.pollUrl)}" style="color:${C.brand}">${esc(d.pollTitle)}</a>`)}
            ${row("Fecha", esc(when))}
          </table>
          ${d.kind === "message" ? `
          <div style="margin:14px 0 4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">Mensaje denunciado</div>
          <div style="padding:12px 14px;border-left:4px solid ${C.danger};background:${C.soft};border-radius:8px;font-size:15px;line-height:1.5;color:${C.ink};white-space:pre-wrap">${esc(d.message)}</div>` : ""}
        </td></tr>
        <tr><td style="padding:12px 22px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${personHtml(d.kind === "message" ? "Escribió el mensaje" : "Persona denunciada", d.reported)}
            ${personHtml("Lo denuncia", d.reporter)}
          </table>
        </td></tr>
        <tr><td style="padding:4px 22px 18px">
          ${button(d.pollUrl, "Abrir la votación", true)}${button(d.consoleUrl, "Ver la denuncia en la consola", false)}
        </td></tr>
        <tr><td style="padding:14px 22px;border-top:1px solid ${C.line};font-size:12px;line-height:1.5;color:${C.muted}">
          Te llega porque tu correo está en <code>config/moderation</code> de Firestore. Quien administra la votación ya
          ve la denuncia y puede ocultar el mensaje o expulsar a la persona.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    d.kind === "message"
      ? `Han denunciado un mensaje de ${d.reported.name} en el chat de «${d.pollTitle}».`
      : `Han denunciado a ${d.reported.name} en «${d.pollTitle}».`,
    "",
    `Motivo: ${d.reason}`,
    d.comment ? `Comentario: «${d.comment}»` : null,
    d.kind === "message" ? `Mensaje: «${d.message}»` : null,
    `Fecha: ${when}`,
    "",
    personText(d.kind === "message" ? "Escribió el mensaje" : "Persona denunciada", d.reported),
    personText("Lo denuncia", d.reporter),
    "",
    `Votación: ${d.pollUrl}`,
    `Denuncia en la consola: ${d.consoleUrl}`,
  ].filter(l => l !== null).join("\n");

  return { html, text };
}
