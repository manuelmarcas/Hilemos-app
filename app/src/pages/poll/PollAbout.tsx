// «Sobre esta votación»: el botón ⓘ junto al título y su ventana. Recoge lo que antes ocupaba la cabecera (la
// descripción, que puede ser larga, el tipo, quién la creó, participantes, fechas, si los votos se ven y cómo se
// entra), para que la pantalla empiece por el título y el tablero.
import type { ReactNode } from "react";
import { MAX_PEOPLE, TYPE, fmtDeadline, hasLimit, plural, pollRange } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { Icon, type IconName } from "../../components/Icon";
import { InfoButton } from "../../components/InfoButton";

/** Botón ⓘ que abre la ventana con la descripción y los datos de la votación. */
export function PollAbout({ poll, creator, people, isOwner }: {
  poll: Poll;
  /** Nombre de quien la creó («ti» si eres tú). */
  creator: string;
  /** Participantes que siguen en la votación. */
  people: number;
  isOwner: boolean;
}) {
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
  return (
    <InfoButton label="Información de la votación" title="Sobre esta votación" dialogClass="about-dialog">
      {poll.description && <p className="about-dialog__desc">{poll.description}</p>}
      <ul className="about-dialog__list">
        {rows.map(([icon, text], i) => (
          <li key={i} className="about-dialog__row"><Icon name={icon} className="about-dialog__icon" /><span>{text}</span></li>
        ))}
      </ul>
    </InfoButton>
  );
}
