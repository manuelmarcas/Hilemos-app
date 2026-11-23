// Perfil de un participante, al pulsar en su nombre en «Participantes»: su foto, su nombre, su papel, desde cuándo
// está y si ha votado. Desde aquí se le denuncia (por su nombre, su foto o su comportamiento); quien administra la
// votación ve además si ya le han denunciado. Lo propio lleva a «Tu perfil».
import { useRef } from "react";
import * as D from "../lib/dates";
import { REPORT_REASONS, ROLE_NAME, roleOf, type Person } from "../lib/model";
import type { PersonReport, Poll, Vote } from "../lib/types";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

export function PersonDialog({ poll, person, vote, me, reports, canReport, onReport, onClose }: {
  poll: Poll;
  person: Person;
  vote: Vote | undefined;
  me: string;
  /** Denuncias que tiene (solo se pasan a quien administra la votación). */
  reports: PersonReport[];
  /** Puede denunciar: está dentro de la votación (aceptado). */
  canReport: boolean;
  onReport: () => void;
  onClose: () => void;
}) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  const own = person.uid === me;
  const role = roleOf(poll, person.uid);
  const voted = poll.anonymous
    ? (person.total ? "Ha votado" : "Aún no ha votado")
    : person.total ? `Ha elegido ${person.total} ${person.total === 1 ? "opción" : "opciones"}` : "Aún no ha votado";
  const reasons = [...new Set(reports.map(r => REPORT_REASONS[r.reason]))].join(" · ");

  return (
    <Dialog className="dialog person-card" onClose={onClose} onOpen={d => { dlg.current = d; }}>
      <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
      <div className="person-card__head">
        <Avatar name={person.name} photo={person.photo} size={72} seed={person.uid} />
        <div className="person-card__id">
          <h2 className="dialog__title person-card__name">{person.name}{own && <span className="muted"> (tú)</span>}</h2>
          <p className="person-card__role">{role ? ROLE_NAME[role] : "Participante"}</p>
        </div>
      </div>
      <ul className="person-card__facts">
        {vote?.joinedAt ? <li>Entró el {D.fmtDayPlain(D.keyOfDate(new Date(vote.joinedAt)))}</li> : null}
        <li>{voted}</li>
      </ul>
      {reports.length > 0 && (
        <p className="person-card__reports">
          <Icon name="flag" /> {reports.length === 1 ? "Le han denunciado una vez" : `Le han denunciado ${reports.length} veces`}: {reasons}.
          Si hace falta, puedes expulsar a {person.name} en «Gestionar participantes».
        </p>
      )}
      <div className="dialog__actions">
        {own
          ? <a className="btn dialog__btn" href="#/perfil"><Icon name="edit" /> Editar tu perfil</a>
          : canReport && (
            <button type="button" className="btn btn--danger dialog__btn" onClick={onReport}>
              <Icon name="flag" /> Denunciar
            </button>
          )}
        <button type="button" className="btn dialog__btn" onClick={() => dlg.current?.close()}>Cerrar</button>
      </div>
    </Dialog>
  );
}
