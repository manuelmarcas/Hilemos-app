// Tableros para votar, uno por tipo de votación: calendario de días (con sus opciones), semanas, meses, horas y
// opciones libres.
// Cada casilla votable es un botón con su recuento; «on» es mi voto y «best» la más votada de su opción.
// Las de días con pocos días votables se votan en una lista (BoardDayList) en vez de en el calendario del mes.
import { useRef, type CSSProperties, type ReactNode } from "react";
import * as D from "../../lib/dates";
import { DEFAULT_CHOICE_ICON, hoursForDay, slotLabel, unitKey, type Tally } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { bem } from "../../lib/util";

export interface BoardProps {
  poll: Poll;
  T: Tally;
  mine: Set<string>;
  canVote: boolean;
  onVote: (u: string) => void;
}

/** Con estos días votables o menos, las de días se votan en una lista: un mes casi entero apagado no ayuda. */
const DAY_LIST_MAX = 5;

/** Casilla para votar. `base`: su clase BEM (p. ej. «cell__opt»), que recibe los modificadores `mods` y, según el
 *  recuento, --on (mi voto) y --best (la más votada). Al pulsarla, el móvil vibra un instante (donde se puede). */
function VoteBtn({ base, mods = {}, u, T, mine, enabled, label, onVote, children }: {
  base: string; mods?: Record<string, unknown>; u: string; T: Tally; mine: Set<string>; enabled: boolean; label?: string;
  onVote: (u: string) => void; children: ReactNode;
}) {
  return (
    <button className={bem(base, { ...mods, on: mine.has(u), best: T.best.has(u) })} aria-pressed={mine.has(u)}
      aria-label={label} disabled={!enabled} onClick={() => { navigator.vibrate?.(10); onVote(u); }}>
      {children}
    </button>
  );
}

/**
 * Recuento de una casilla. Cuando cambia (alguien vota o quita su voto), da un pequeño salto: la `key` lo vuelve a
 * montar para repetir la animación, y la clase se queda puesta desde el primer cambio (no salta al cargar).
 */
function Count({ T, u }: { T: Tally; u: string }) {
  const n = T.counts[u] || 0;
  const first = useRef(n);
  return <span key={n} className={bem("count", { bump: n !== first.current })}>{n}</span>;
}

export function BoardDays(props: BoardProps) {
  if (props.poll.slots.length <= DAY_LIST_MAX) return <BoardDayList {...props} />;
  const { poll, T, mine, canVote, onVote } = props;
  const slots = new Set(poll.slots);
  return (
    <div className="calendar">
      {poll.months.map(mk => {
        const { y, m } = D.parseMonth(mk);
        const cells: ReactNode[] = D.DOW.map(x => <div key={`h${x}`} className="calendar__dow">{x}</div>);
        for (let i = 0, first = D.dowMon(new Date(y, m, 1)); i < first; i++) cells.push(<div key={`e${i}`} className="cell cell--empty"></div>);
        for (let d = 1, n = D.daysInMonth(y, m); d <= n; d++) {
          const k = D.dayKey(y, m, d), on = slots.has(k);
          // Un día que no se vota solo lleva su número: sin las opciones apagadas, la fila ocupa menos.
          if (!on) {
            cells.push(<div key={k} className="cell cell--off"><div className="cell__day">{d}</div></div>);
            continue;
          }
          cells.push(
            <div key={k} className={bem("cell", { [`n${T.opts.length}`]: true })}>
              <div className="cell__day">{d}</div>
              {T.opts.map((o, i) => {
                const u = unitKey(k, o.id);
                return (
                  <VoteBtn key={o.id} base="cell__opt" mods={{ [`c${i}`]: true }} u={u} T={T} mine={mine} enabled={canVote}
                    label={`${D.fmtDayLong(k)} · ${o.name}`} onVote={onVote}>
                    <span className="cell__label">{o.icon}</span><Count T={T} u={u} />
                  </VoteBtn>
                );
              })}
            </div>,
          );
        }
        // Los días de la semana sin ningún día votable ese mes van más estrechos, para dar sitio a los que sí.
        const wide = D.weekdaysWith(y, m, slots);
        const cols = wide.some(Boolean) && !wide.every(Boolean)
          ? { "--calendar-cols": wide.map(w => (w ? "minmax(0,1fr)" : "minmax(0,.5fr)")).join(" ") } as CSSProperties
          : undefined;
        return (
          <div key={mk} className="calendar__month">
            <h2 className="calendar__title">{D.fmtMonth(mk)}</h2>
            <div className="calendar__grid" style={cols}>{cells}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Votación de días con pocos días: una fila por día votable, con la fecha y un botón grande por opción. */
function BoardDayList({ poll, T, mine, canVote, onVote }: BoardProps) {
  // Con una o dos opciones hay sitio para su nombre; con más, solo el icono (la leyenda de arriba dice cuál es cuál).
  const named = T.opts.length <= 2;
  return (
    <div className="day-list">
      {[...poll.slots].sort().map(k => {
        const dt = D.parseDay(k);
        return (
          <div key={k} className="day-list__row">
            <div className="day-list__date" aria-hidden="true">
              <span className="day-list__dow">{D.DSHORT[D.dowMon(dt)]}</span>
              <span className="day-list__num">{dt.getDate()}</span>
              <span className="day-list__mon">{D.MSHORT[dt.getMonth()]}</span>
            </div>
            <div className="day-list__opts">
              {T.opts.map((o, i) => {
                const u = unitKey(k, o.id);
                return (
                  <VoteBtn key={o.id} base="day-list__opt" mods={{ [`c${i}`]: true }} u={u} T={T} mine={mine} enabled={canVote}
                    label={`${D.fmtDayLong(k)} · ${o.name}`} onVote={onVote}>
                    <span className="day-list__icon">{o.icon}</span>
                    {named && <span className="day-list__name">{o.name}</span>}
                    <Count T={T} u={u} />
                  </VoteBtn>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BoardWeeks({ poll, T, mine, canVote, onVote }: BoardProps) {
  const slots = new Set(poll.slots);
  return (
    <div className="calendar">
      {poll.months.map(mk => {
        const { y, m } = D.parseMonth(mk);
        return (
          <div key={mk} className="calendar__month">
            <h2 className="calendar__title">{D.fmtMonth(mk)}</h2>
            <div className="week-board__head"><span></span>{D.DOW.map(x => <span key={x}>{x}</span>)}<span></span></div>
            <div className="week-board__rows">
              {D.monthWeeks(y, m).map(w => {
                const on = slots.has(w.key), u = unitKey(w.key, "v");
                return (
                  <VoteBtn key={w.key} base="week-board__row" mods={{ off: !on }} u={u} T={T} mine={mine} enabled={on && canVote}
                    label={D.fmtWeek(w.key)} onVote={onVote}>
                    <span className="week-board__num">S{w.num}</span>
                    {w.days.map(d => <span key={d.key} className={bem("week-board__day", { out: !d.inMonth })}>{d.d}</span>)}
                    <span className="week-board__count">{on && <Count T={T} u={u} />}</span>
                  </VoteBtn>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BoardMonths({ poll, T, mine, canVote, onVote }: BoardProps) {
  const slots = new Set(poll.slots);
  const years = [...new Set(poll.months.map(k => k.slice(0, 4)))].sort();
  return <>
    {years.map(y => (
      <div key={y} className="month-board">
        <h2 className="month-board__title">{y}</h2>
        <div className="month-board__tiles">
          {D.MNAMES.map((name, m) => {
            const k = D.monthKey(Number(y), m), on = slots.has(k), u = unitKey(k, "v");
            return (
              <VoteBtn key={k} base="month-board__tile" mods={{ off: !on }} u={u} T={T} mine={mine} enabled={on && canVote}
                label={D.fmtMonth(k)} onVote={onVote}>
                <span className="month-board__name">{name}</span>{on && <Count T={T} u={u} />}
              </VoteBtn>
            );
          })}
        </div>
      </div>
    ))}
  </>;
}

export function BoardHours({ poll, T, mine, canVote, onVote }: BoardProps) {
  const days = poll.slots;
  // Con horas sueltas, cada día puede tener sus propias horas: las filas son la unión de todas.
  const rows = poll.hourList ? [...new Set(days.flatMap(d => hoursForDay(poll, d)))].sort() : (poll.hours || []);
  return (
    <div className="hour-board">
      <div className="hour-board__scroll">
        <table className="hour-board__table">
          <thead>
            <tr>
              <th className="hour-board__corner"></th>
              {days.map(d => {
                const dt = D.parseDay(d);
                return (
                  <th key={d} scope="col">
                    <span className="hour-board__dow">{D.DSHORT[D.dowMon(dt)]}</span>
                    <span className="hour-board__day">{dt.getDate()}</span>
                    <span className="hour-board__mon">{D.MSHORT[dt.getMonth()]}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(h => (
              <tr key={h}>
                <th scope="row">{h}</th>
                {days.map(d => {
                  const has = !poll.hourList || hoursForDay(poll, d).includes(h);
                  const s = `${d}T${h}`, u = unitKey(s, "v");
                  return (
                    <td key={d}>
                      <VoteBtn base="hour-board__cell" mods={{ off: !has }} u={u} T={T} mine={mine} enabled={has && canVote}
                        label={slotLabel(poll, s)} onVote={onVote}>
                        {has && <Count T={T} u={u} />}
                      </VoteBtn>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BoardOptions({ poll, T, mine, canVote, onVote }: BoardProps) {
  return (
    <div className="choice-board">
      <div className="choice-board__list">
        {(poll.options || []).map(o => {
          const u = unitKey(o.id, "v");
          return (
            <VoteBtn key={o.id} base="choice-board__item" u={u} T={T} mine={mine} enabled={canVote} label={o.name} onVote={onVote}>
              <span className="choice-board__icon" aria-hidden="true">{o.icon || DEFAULT_CHOICE_ICON}</span>
              <span className="choice-board__name">{o.name}</span>
              <Count T={T} u={u} />
            </VoteBtn>
          );
        })}
      </div>
    </div>
  );
}
