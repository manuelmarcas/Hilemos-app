// Avisos del chat: a cada persona solo se le avisa del primer mensaje que no ha visto. Hasta que vuelva a abrir el
// chat, los siguientes no avisan. Así un chat animado no manda un aviso por mensaje, y solo hace falta escribir
// cuando cambia algo: `chatAt` en su biblioteca (users/{uid}/polls/{pollId}) apunta ese primer mensaje sin leer.
// La app lo usa también para el icono de «mensajes sin leer» de «Mis votaciones» (hasUnreadChat en model.ts).

/**
 * Si el mensaje de la hora `at` es el primero que no ha visto quien tiene la entrada `entry` de su biblioteca: no lo
 * ha visto (`chatSeenAt` es anterior) y ya había visto el último del que se le avisó (`chatAt`).
 */
export function firstUnread(entry, at) {
  const seen = entry?.chatSeenAt || 0;
  return seen < at && (entry?.chatAt || 0) <= seen;
}
