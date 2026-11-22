// «Gestionar participantes» (administradores, desde el menú ⋯): nombrar o quitar administradores con un clic (solo
// quien gestiona la votación), sacar a alguien (con confirmación) y volver a admitir a quien se sacó.
import { useState } from "react";
import { MAX_ADMINS, PEOPLE_FILTER_FROM, isFull, managedPeople, type ManagedPerson } from "../../lib/model";
import type { Poll, Votes } from "../../lib/types";
import { searchKey } from "../../lib/util";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";
import { RoleTag } from "./People";

export function ManagePeople({ poll, votes, me, onToggleAdmin, onRemove, onReadmit, onClose }: {
  poll: Poll; votes: Votes; me: string;
  onToggleAdmin: (uid: string, name: string) => void;
  onRemove: (uid: string, name: string) => void;
  onReadmit: (uid: string, name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { inside, removed } = managedPeople(poll, votes, me);
  const owner = poll.ownerUid === me;
  const admins = poll.admins || [];
  const adminsFull = admins.length >= MAX_ADMINS;
  const full = isFull(poll);
  const q = searchKey(query.trim());
  const shown = q ? inside.filter(p => searchKey(p.name).includes(q)) : inside;

  const who = (p: ManagedPerson) => (
    <span className="person manage-people__person">
      <Avatar name={p.name} photo={p.photo} size={30} seed={p.uid} />
      <span>{p.name}{p.uid === me && <> <span className="muted">(tú)</span></>}<RoleTag poll={poll} uid={p.uid} /></span>
    </span>
  );

  return (
    <section className="manage-people" aria-label="Gestionar participantes">
      <h2 className="manage-people__title"><Icon name="users" /> Gestionar participantes</h2>
      <p className="manage-people__sub">
        {owner
          ? "Los administradores gestionan la votación como tú, salvo eliminarla y nombrar a otros. "
          : "Solo quien gestiona la votación puede nombrar administradores. "}
        Si sacas a alguien, sus votos dejan de contar y no podrá volver a entrar con el enlace.
      </p>
      {inside.length >= PEOPLE_FILTER_FROM && (
        <input className="input input--small manage-people__search" type="search" placeholder="Buscar participante…"
          aria-label="Buscar participante" value={query} onChange={e => setQuery(e.target.value)} />
      )}
      <ul className="manage-people__list">
        {shown.map(p => {
          const isAdm = p.role === "admin";
          return (
            <li key={p.uid} className="manage-people__row">
              {who(p)}
              {(p.canToggleAdmin || p.canRemove) && (
                <span className="manage-people__actions">
                  {p.canToggleAdmin && (
                    <button type="button" className="btn btn--small" aria-pressed={isAdm}
                      disabled={!isAdm && adminsFull} data-tip={!isAdm && adminsFull ? `Como mucho ${MAX_ADMINS} administradores` : undefined}
                      onClick={() => onToggleAdmin(p.uid, p.name)}>
                      {isAdm ? "Quitar admin" : "Hacer admin"}
                    </button>
                  )}
                  {p.canRemove && (
                    <button type="button" className="btn btn--small btn--danger" onClick={() => onRemove(p.uid, p.name)}>Sacar</button>
                  )}
                </span>
              )}
            </li>
          );
        })}
        {!shown.length && <li className="manage-people__empty muted">Nadie coincide con la búsqueda.</li>}
      </ul>
      {removed.length > 0 && <>
        <h3 className="manage-people__subtitle">Sacados <span className="muted">({removed.length})</span></h3>
        <ul className="manage-people__list">
          {removed.map(p => (
            <li key={p.uid} className="manage-people__row manage-people__row--removed">
              {who(p)}
              <span className="manage-people__actions">
                <button type="button" className="btn btn--small" disabled={full} data-tip={full ? "No quedan plazas" : undefined}
                  onClick={() => onReadmit(p.uid, p.name)}>Volver a admitir</button>
              </span>
            </li>
          ))}
        </ul>
      </>}
      <div className="manage-people__actions-bar">
        <button type="button" className="btn" onClick={onClose}>Cerrar</button>
      </div>
    </section>
  );
}
