// Pestaña «Participantes»: la tabla (con lo que ha votado cada uno, sus papeles y, para el creador, nombrar
// administradores) y, con muchos participantes, buscador, filtros y lista recortada.
import { Fragment, type ReactNode } from "react";
import * as D from "../../lib/dates";
import { PEOPLE_FILTER_FROM, slotShort, type Person, type Tally } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";

// Votos de una persona en una línea compacta: etiquetas agrupadas por opción (y por día en las de horas).
function PersonVotes({ poll, T, picks }: { poll: Poll; T: Tally; picks: string[] }) {
  const bySlot = new Map<string, string[]>(T.opts.map(o => [o.id, []]));
  picks.forEach(p => { const i = p.lastIndexOf("|"); bySlot.get(p.slice(i + 1))?.push(p.slice(0, i)); });
  return <>
    {T.opts.map((o, idx) => {
      const slots = bySlot.get(o.id) || [];
      if (!slots.length) return null;
      let chips: ReactNode;
      if (poll.type === "hours") {
        const byDay = new Map<string, string[]>();
        slots.forEach(s => { const [d, h] = s.split("T"); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d)!.push(h); });
        chips = [...byDay].map(([d, hs]) => <span key={d} className="vchip"><b>{D.fmtDayShort(d)}</b> {hs.join(", ")}</span>);
      } else {
        chips = slots.map(s => <span key={s} className="vchip">{slotShort(poll, s)}</span>);
      }
      return (
        <div key={o.id} className="vline">
          {poll.type === "days" && <span className="vopt" title={o.name}><span className={`sw c${idx}`}></span>{o.icon}</span>}
          <div className="vchips">{chips}</div>
        </div>
      );
    })}
  </>;
}

export function PeopleTable({ poll, T, people, me, openPeople, onToggle, onToggleAdmin }: {
  poll: Poll; T: Tally; people: Person[]; me: string; openPeople: Set<string>; onToggle: (uid: string) => void;
  /** Solo para el creador: nombrar o quitar administradores. */
  onToggleAdmin?: (uid: string, name: string) => void;
}) {
  const admins = poll.admins || [];
  // Si el creador eliminó su cuenta, «Creador» se queda en su nombre sin dueño y quien la gestiona es «Delegado».
  const role = (uid: string) => uid === poll.founder ? <span className="role-tag owner">Creador</span>
    : uid === poll.ownerUid ? <span className="role-tag owner">{poll.founder ? "Delegado" : "Creador"}</span>
    : admins.includes(uid) ? <span className="role-tag">Admin</span> : null;
  const adminBtn = (p: Person) => onToggleAdmin && p.uid !== poll.ownerUid && !p.gone && (
    <button type="button" className="link-btn admin-btn" onClick={() => onToggleAdmin(p.uid, p.name)}>
      {admins.includes(p.uid) ? "Quitar admin" : "Hacer admin"}
    </button>
  );
  const anon = !!poll.anonymous;
  const multi = poll.type === "days" && !anon;
  const cols = anon ? 2 : multi ? T.opts.length + 1 : 2;
  return (
    <table>
      <thead>
        <tr>
          <th>Participante</th>
          {anon ? <th className="n">¿Ha votado?</th>
            : multi ? T.opts.map(o => <th key={o.id} className="n">{o.icon} {o.name}</th>)
            : <th className="n">Votos</th>}
        </tr>
      </thead>
      <tbody>
        {people.length ? people.map(p => {
          const who = <>
            <Avatar name={p.name} photo={p.photo} size={26} seed={p.uid} />
            <span>
              {p.name}
              {p.uid === me && <> <span className="muted">(tú)</span></>}
              {role(p.uid)}
              {!anon && !p.total && <> <span className="muted">· aún no ha votado</span></>}
            </span>
          </>;
          if (anon) {
            return (
              <tr key={p.uid}>
                <td><div className="person-cell"><span className="person">{who}</span>{adminBtn(p)}</div></td>
                <td className="n">{p.total ? <><Icon name="check" /> Sí</> : <span className="muted">Aún no</span>}</td>
              </tr>
            );
          }
          const open = openPeople.has(p.uid) && p.total > 0;
          return (
            <Fragment key={p.uid}>
              <tr className={open ? "open" : ""}>
                <td>
                  <div className="person-cell">
                    {p.total
                      ? (
                        <button className="person person-btn" aria-expanded={open} onClick={() => onToggle(p.uid)}>
                          <span className="caret" aria-hidden="true">▸</span>{who}
                        </button>
                      )
                      : <span className="person person-idle">{who}</span>}
                    {adminBtn(p)}
                  </div>
                </td>
                {multi ? T.opts.map(o => <td key={o.id} className="n">{p.perOpt[o.id]}</td>) : <td className="n">{p.total}</td>}
              </tr>
              {open && <tr className="pv-row"><td colSpan={cols}><PersonVotes poll={poll} T={T} picks={p.picks} /></td></tr>}
            </Fragment>
          );
        }) : <tr><td colSpan={cols}>{T.people.length ? "Nadie coincide con la búsqueda." : "Todavía no ha entrado nadie."}</td></tr>}
      </tbody>
    </table>
  );
}

export type PeopleFilter = "all" | "voted" | "novote";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Con muchos participantes: buscador, filtro (han votado / sin votar) y lista recortada con «Ver todos». */
export function PeopleList({ T, query, setQuery, filter, setFilter, all, setAll, children }: {
  T: Tally; query: string; setQuery: (q: string) => void; filter: PeopleFilter; setFilter: (f: PeopleFilter) => void;
  all: boolean; setAll: (a: boolean) => void; children: (people: Person[]) => ReactNode;
}) {
  const many = T.people.length >= PEOPLE_FILTER_FROM;
  if (!many) return <>{children(T.people)}</>;
  const q = norm(query.trim());
  const voted = T.people.filter(p => p.total > 0).length;
  const filtered = T.people.filter(p =>
    (filter === "all" || (filter === "voted") === p.total > 0) && (!q || norm(p.name).includes(q)));
  const cut = !all && !q && filtered.length > PEOPLE_FILTER_FROM;
  const chips: [PeopleFilter, string, number][] = [
    ["all", "Todos", T.people.length], ["voted", "Han votado", voted], ["novote", "Sin votar", T.people.length - voted],
  ];
  return <>
    <div className="people-tools">
      <input className="input small people-search" type="search" placeholder="Buscar participante…" aria-label="Buscar participante"
        value={query} onChange={e => setQuery(e.target.value)} />
      <div className="people-chips" role="group" aria-label="Filtrar participantes">
        {chips.map(([k, label, n]) => (
          <button key={k} type="button" className={`chip ${filter === k ? "on" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label} <span className="n">{n}</span>
          </button>
        ))}
      </div>
    </div>
    {children(cut ? filtered.slice(0, PEOPLE_FILTER_FROM) : filtered)}
    {cut && <button type="button" className="link-btn people-more" onClick={() => setAll(true)}>Ver los {filtered.length}</button>}
    {all && !q && filtered.length > PEOPLE_FILTER_FROM && (
      <button type="button" className="link-btn people-more" onClick={() => setAll(false)}>Ver menos</button>
    )}
  </>;
}
