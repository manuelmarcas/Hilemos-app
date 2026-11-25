// Perfil de un participante, al pulsar en su nombre en «Participantes»: su foto, su nombre, su papel, desde cuándo
// está, si ha votado y las otras votaciones en las que coincidís. Desde aquí se le denuncia (por su nombre, su foto o
// su comportamiento); quien administra la votación ve además sus denuncias. Lo propio lleva a «Tu perfil».
import { useRef } from "react";
import * as D from "../lib/dates";
import { REPORT_REASONS, ROLE_NAME, TYPE, roleOf, type Person } from "../lib/model";
import type { PersonReport, Poll, PollType, ReportReason, Vote } from "../lib/types";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Spinner } from "./Loading";

/** Votaciones en común que se enseñan como mucho (el resto, «y N más»). */
const SHARED_SHOWN = 5;

export interface SharedPoll {
  id: string;
  title: string;
  type?: PollType;
}

export function PersonDialog({ poll, person, vote, me, reports, shared, canReport, reportedByMe, onReport, onClose }: {
  poll: Poll;
  person: Person;
  vote: Vote | undefined;
  me: string;
  /** Denuncias que tiene (solo se pasan a quien administra la votación). */
  reports: PersonReport[];
  /** Otras votaciones de tu lista en las que también está (null mientras se buscan). No se pasa en el propio. */
  shared?: SharedPoll[] | null;
  /** Puede denunciar: está dentro de la votación (aceptado). */
  canReport: boolean;
  /** Ya le ha denunciado (solo se puede una vez). */
  reportedByMe?: boolean;
  onReport: () => void;
  onClose: () => void;
}) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  const own = person.uid === me;
  const role = roleOf(poll, person.uid);
  // En el propio, en segunda persona («Has elegido 3 opciones», «Entraste el…»).
  const opts = `${person.total} ${person.total === 1 ? "opción" : "opciones"}`;
  const voted = !person.total ? (own ? "Aún no has votado" : "Aún no ha votado")
    : poll.anonymous ? (own ? "Has votado" : "Ha votado")
    : own ? `Has elegido ${opts}` : `Ha elegido ${opts}`;
  // Denuncias agrupadas por motivo, con sus comentarios.
  const byReason = new Map<ReportReason, string[]>();
  for (const r of reports) byReason.set(r.reason, [...(byReason.get(r.reason) || []), ...(r.comment ? [r.comment] : [])]);
  const counts = new Map<ReportReason, number>();
  for (const r of reports) counts.set(r.reason, (counts.get(r.reason) || 0) + 1);

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
        {vote?.joinedAt ? <li className="person-card__fact"><Icon name="days" /> {own ? "Entraste" : "Entró"} el {D.fmtDayPlain(D.keyOfDate(new Date(vote.joinedAt)))}</li> : null}
        <li className="person-card__fact"><Icon name={person.total ? "check" : "hourglass"} /> {voted}</li>
      </ul>
      {shared !== undefined && (
        <section className="person-card__section" aria-labelledby="person-shared">
          <h3 className="person-card__label" id="person-shared">Otras votaciones en común</h3>
          {shared === null
            ? <p className="person-card__empty" role="status"><Spinner /> Buscando…</p>
            : shared.length
              ? <>
                <ul className="person-card__polls">
                  {shared.slice(0, SHARED_SHOWN).map(s => (
                    <li key={s.id}>
                      <a className="person-card__poll" href={`#/v/${s.id}`} onClick={() => dlg.current?.close()}>
                        <Icon name={(s.type && TYPE[s.type]?.icon) || "vote"} /> <span className="person-card__poll-title">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
                {shared.length > SHARED_SHOWN && <p className="person-card__empty">y {shared.length - SHARED_SHOWN} más</p>}
              </>
              : <p className="person-card__empty">No coincidís en ninguna otra votación.</p>}
        </section>
      )}
      {reports.length > 0 && (
        <div className="person-card__reports">
          <p className="person-card__reports-title">
            <Icon name="flag" /> <strong>{own ? "Te han denunciado" : "Le han denunciado"} {reports.length === 1 ? "una vez" : `${reports.length} veces`}</strong>
          </p>
          <ul className="person-card__reasons">
            {[...byReason].map(([reason, comments]) => (
              <li key={reason}>
                <strong>{REPORT_REASONS[reason]}</strong>{(counts.get(reason) || 0) > 1 && ` (${counts.get(reason)})`}
                {comments.map((c, i) => <span key={i} className="person-card__comment">«{c}»</span>)}
              </li>
            ))}
          </ul>
          {!own && (
            <p className="person-card__reports-hint">
              Si hace falta, puedes expulsar a {person.name} en «Gestionar participantes».
            </p>
          )}
        </div>
      )}
      <div className="dialog__actions">
        {own
          ? <a className="btn dialog__btn" href="#/perfil"><Icon name="edit" /> Editar tu perfil</a>
          : canReport && (reportedByMe
            ? <span className="person-card__reported"><Icon name="flag" /> Ya le has denunciado</span>
            : (
              <button type="button" className="btn btn--danger dialog__btn" onClick={onReport}>
                <Icon name="flag" /> Denunciar
              </button>
            ))}
        <button type="button" className="btn dialog__btn" onClick={() => dlg.current?.close()}>Cerrar</button>
      </div>
    </Dialog>
  );
}
