// Avisos del chat: a cada persona solo se le avisa del primer mensaje que no ha visto. Hasta que vuelva a abrir el
// chat, los siguientes no avisan: así un chat animado no manda un aviso por mensaje. Solo hace falta escribir cuando
// cambia algo: `chatNotifiedAt` en su biblioteca (users/{uid}/polls/{pollId}) apunta el mensaje del que se le avisó.

/**
 * Si el mensaje de la hora `at` es el primero que no ha visto quien tiene la entrada `entry` de su biblioteca: no lo
 * ha visto (`chatSeenAt` es anterior) y ya había visto aquel del que se le avisó la última vez (`chatNotifiedAt`).
 */
export function firstUnread(entry, at) {
  const seen = entry?.chatSeenAt || 0;
  return seen < at && (entry?.chatNotifiedAt || 0) <= seen;
}
