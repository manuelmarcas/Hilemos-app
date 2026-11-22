// Pestaña «Participantes»: la tabla (con lo que ha votado cada uno, sus papeles y, para el creador, nombrar
// administradores); con muchos participantes, buscador, filtros y lista recortada; y debajo, plegado, «Se fueron».
import { Fragment, useState, type ReactNode } from "react";
import * as D from "../../lib/dates";
import { PEOPLE_FILTER_FROM, slotShort, type Person, type Tally } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { bem } from "../../lib/util";
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
        chips = [...byDay].map(([d, hs]) => <span key={d} className="person-votes__chip"><b>{D.fmtDayShort(d)}</b> {hs.join(", ")}</span>);
      } else {
        chips = slots.map(s => <span key={s} className="person-votes__chip">{slotShort(poll, s)}</span>);
      }
      return (
        <div key={o.id} className="person-votes__line">
          {poll.type === "days" && <span className="person-votes__opt" data-tip={o.name} role="img" aria-label={o.name}><span className={`swatch swatch--c${idx}`}></span>{o.icon}</span>}
          <div className="person-votes__chips">{chips}</div>
        </div>
      );
    })}
  </>;
}

export function PeopleTable({ poll, T, people, empty = "Todavía no ha entrado nadie.", me, openPeople, onToggle, onToggleAdmin, gone }: {
  poll: Poll; T: Tally; people: Person[]; me: string; openPeople: Set<string>; onToggle: (uid: string) => void;
  /** La de «Se fueron»: en gris. */
  gone?: boolean;
  /** Texto de la tabla sin nadie. */
  empty?: string;
  /** Solo para el creador: nombrar o quitar administradores. */
  onToggleAdmin?: (uid: string, name: string) => void;
}) {
  const admins = poll.admins || [];
  // Si el creador se fue, «Creador» se queda en su nombre sin dueño (en «Se fueron») y quien la gestiona es «Delegado».
  const role = (uid: string) => uid === poll.founder ? <span className="role-tag role-tag--owner">Creador</span>
    : uid === poll.ownerUid ? <span className="role-tag role-tag--owner">{poll.founder ? "Delegado" : "Creador"}</span>
    : admins.includes(uid) ? <span className="role-tag">Admin</span> : null;
  const adminBtn = (p: Person) => onToggleAdmin && p.uid !== poll.ownerUid && !p.gone && (
    <button type="button" className="link-btn people-table__admin" onClick={() => onToggleAdmin(p.uid, p.name)}>
      {admins.includes(p.uid) ? "Quitar admin" : "Hacer admin"}
    </button>
  );
  const anon = !!poll.anonymous;
  const multi = poll.type === "days" && !anon;
  const cols = anon ? 2 : multi ? T.opts.length + 1 : 2;
  return (
    <table className={bem("people-table", { gone })}>
      <thead>
        <tr>
          <th>Participante</th>
          {anon ? <th className="people-table__num">¿Ha votado?</th>
            : multi ? T.opts.map(o => <th key={o.id} className="people-table__num">{o.icon} {o.name}</th>)
            : <th className="people-table__num">Votos</th>}
        </tr>
      </thead>
      <tbody>
        {people.length ? people.map(p => {
          const who = <>
            <Avatar name={p.name} photo={p.photo} size={26} seed={p.uid} className="people-table__avatar" />
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
                <td><div className="people-table__person"><span className="person">{who}</span>{adminBtn(p)}</div></td>
                <td className="people-table__num">{p.total ? <><Icon name="check" /> Sí</> : <span className="muted">Aún no</span>}</td>
              </tr>
            );
          }
          const open = openPeople.has(p.uid) && p.total > 0;
          return (
            <Fragment key={p.uid}>
              <tr className={bem("people-table__row", { open })}>
                <td>
                  <div className="people-table__person">
                    {p.total
                      ? (
                        <button className="person person__btn" aria-expanded={open} onClick={() => onToggle(p.uid)}>
                          <span className="person__caret" aria-hidden="true">▸</span>{who}
                        </button>
                      )
                      : <span className="person person--idle">{who}</span>}
                    {adminBtn(p)}
                  </div>
                </td>
                {multi ? T.opts.map(o => <td key={o.id} className="people-table__num">{p.perOpt[o.id]}</td>) : <td className="people-table__num">{p.total}</td>}
              </tr>
              {open && <tr className="people-table__votes"><td colSpan={cols}><PersonVotes poll={poll} T={T} picks={p.picks} /></td></tr>}
            </Fragment>
          );
        }) : <tr><td colSpan={cols}>{empty}</td></tr>}
      </tbody>
    </table>
  );
}

export type PeopleFilter = "all" | "voted" | "novote";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Con muchos participantes (`people`): buscador, filtro (han votado / sin votar) y lista recortada con «Ver todos».
 * `children` pinta la tabla con los que se ven y el texto para cuando no se ve ninguno.
 */
export function PeopleList({ people, query, setQuery, filter, setFilter, all, setAll, children }: {
  people: Person[]; query: string; setQuery: (q: string) => void; filter: PeopleFilter; setFilter: (f: PeopleFilter) => void;
  all: boolean; setAll: (a: boolean) => void; children: (people: Person[], empty: string) => ReactNode;
}) {
  const empty = people.length ? "Nadie coincide con la búsqueda." : "Todavía no ha entrado nadie.";
  if (people.length < PEOPLE_FILTER_FROM) return <>{children(people, empty)}</>;
  const q = norm(query.trim());
  const voted = people.filter(p => p.total > 0).length;
  const filtered = people.filter(p =>
    (filter === "all" || (filter === "voted") === p.total > 0) && (!q || norm(p.name).includes(q)));
  const cut = !all && !q && filtered.length > PEOPLE_FILTER_FROM;
  const chips: [PeopleFilter, string, number][] = [
    ["all", "Todos", people.length], ["voted", "Han votado", voted], ["novote", "Sin votar", people.length - voted],
  ];
  return <>
    <div className="people-filter">
      <input className="input input--small people-filter__search" type="search" placeholder="Buscar participante…" aria-label="Buscar participante"
        value={query} onChange={e => setQuery(e.target.value)} />
      <div className="people-filter__chips" role="group" aria-label="Filtrar participantes">
        {chips.map(([k, label, n]) => (
          <button key={k} type="button" className={`chip ${filter === k ? "chip--on" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label} <span className="chip__count">{n}</span>
          </button>
        ))}
      </div>
    </div>
    {children(cut ? filtered.slice(0, PEOPLE_FILTER_FROM) : filtered, empty)}
    {cut && <button type="button" className="link-btn people-filter__more" onClick={() => setAll(true)}>Ver los {filtered.length}</button>}
    {all && !q && filtered.length > PEOPLE_FILTER_FROM && (
      <button type="button" className="link-btn people-filter__more" onClick={() => setAll(false)}>Ver menos</button>
    )}
  </>;
}

/**
 * «Se fueron»: quienes salieron de la votación ya cerrada (o eliminaron su cuenta). Sus votos siguen contando, con un
 * nombre sin dueño, así que van aparte y plegados: los totales cuadran sin mezclarlos con quien sigue.
 */
export function GonePeople({ poll, T, people, me, openPeople, onToggle }: {
  poll: Poll; T: Tally; people: Person[]; me: string; openPeople: Set<string>; onToggle: (uid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="people-gone">
      <button type="button" className="people-gone__btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="people-gone__caret" aria-hidden="true">▸</span> Se fueron <span className="muted">({people.length})</span>
      </button>
      {open && <>
        <p className="people-panel__hint people-gone__hint">Salieron cuando ya no se podía votar: sus votos siguen contando, con un nombre sin dueño.</p>
        <div className="people-panel__scroll">
          <PeopleTable poll={poll} T={T} people={people} me={me} openPeople={openPeople} onToggle={onToggle} gone />
        </div>
      </>}
    </div>
  );
}
