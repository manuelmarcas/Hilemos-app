// «Sobre esta votación»: el botón ⓘ junto al título y su ventana. Recoge lo que antes ocupaba la cabecera y las
// pestañas con texto fijo (tipo, quién la creó, participantes, fechas, si los votos se ven, cómo entrar y cómo se usa),
// para que la pantalla empiece por el título y el tablero.
import { useRef, useState, type ReactNode } from "react";
import { MAX_PEOPLE, TYPE, fmtDeadline, hasLimit, plural, pollRange } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { hasMouse } from "../../lib/util";
import { Dialog } from "../../components/Dialog";
import { Icon, type IconName } from "../../components/Icon";

/** Botón ⓘ que abre la ventana con los datos de la votación y cómo se usa. */
export function PollAbout({ poll, creator, people, isOwner, canWrite }: {
  poll: Poll;
  /** Nombre de quien la creó («ti» si eres tú). */
  creator: string;
  /** Participantes que siguen en la votación. */
  people: number;
  isOwner: boolean;
  /** Está dentro: puede escribir y denunciar en el chat. */
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dlg = useRef<HTMLDialogElement | null>(null);
  const t = TYPE[poll.type];
  // El máximo solo se enseña a quien la gestiona o si es menor que el tope general (si no, no dice nada).
  const max = hasLimit(poll) && (isOwner || (poll.maxPeople as number) < MAX_PEOPLE) ? ` (máximo ${poll.maxPeople})` : "";
  const rows: [IconName, ReactNode][] = [
    [t.icon, <>Votación por {t.name.toLowerCase()}, creada por {creator}.</>],
    ["users", <>{plural(people, ["participante", "participantes"])}{max}.</>],
    [poll.type === "options" ? "options" : "days", pollRange(poll)],
    poll.anonymous
      ? ["incognito", "Es anónima: nadie ve qué ha votado cada persona, solo los totales. En el chat sí se ve tu nombre."]
      : ["eye", "Los votos se ven: cada participante puede ver qué ha votado cada uno."],
  ];
  if (poll.deadline) rows.push(["hourglass", <>Se puede votar hasta el {fmtDeadline(poll.deadline)}.</>]);
  if (poll.emailsOnly) rows.push(["mail", "Solo pueden entrar los correos invitados."]);
  if (poll.approval) rows.push(["approve", "Quien la administra acepta a cada persona que pide entrar."]);
  const tips = [
    "En «Participantes», pulsa en un nombre para ver su perfil y en el resto de la fila para ver qué ha votado.",
    ...(canWrite ? [hasMouse()
      ? "En el chat, la bandera de cada mensaje sirve para denunciarlo."
      : "En el chat, mantén pulsado un mensaje para denunciarlo."] : []),
  ];
  return <>
    <button type="button" className="info-btn" aria-label="Información de la votación" data-tip="Información"
      onClick={() => setOpen(true)}><Icon name="info" /></button>
    {open && (
      <Dialog className="dialog about-dialog" onClose={() => setOpen(false)} onOpen={d => { dlg.current = d; }}>
        <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
        <h2 className="dialog__title">Sobre esta votación</h2>
        <ul className="about-dialog__list">
          {rows.map(([icon, text], i) => (
            <li key={i} className="about-dialog__row"><Icon name={icon} className="about-dialog__icon" /><span>{text}</span></li>
          ))}
        </ul>
        <h3 className="about-dialog__label">Cómo se usa</h3>
        <ul className="about-dialog__tips">
          {tips.map(tip => <li key={tip}>{tip}</li>)}
        </ul>
      </Dialog>
    )}
  </>;
}
