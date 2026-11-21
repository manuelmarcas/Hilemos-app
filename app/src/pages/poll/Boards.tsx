// Tableros para votar, uno por tipo de votación: calendario de días (con sus opciones), semanas, meses, horas y
// opciones libres.
// Cada casilla votable es un botón con su recuento; «on» es mi voto y «best» la más votada de su opción.
import type { ReactNode } from "react";
import * as D from "../../lib/dates";
import { DEFAULT_CHOICE_ICON, hoursForDay, slotLabel, unitKey, type Tally } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { cls } from "../../lib/util";

export interface BoardProps {
  poll: Poll;
  T: Tally;
  mine: Set<string>;
  canVote: boolean;
  onVote: (u: string) => void;
}

function VoteBtn({ base, u, T, mine, enabled, label, onVote, children }: {
  base: string; u: string; T: Tally; mine: Set<string>; enabled: boolean; label?: string; onVote: (u: string) => void; children: ReactNode;
}) {
  return (
    <button className={cls(base, mine.has(u) && "on", T.best.has(u) && "best")} aria-pressed={mine.has(u)}
      aria-label={label} disabled={!enabled} onClick={() => onVote(u)}>
      {children}
    </button>
  );
}

const Count = ({ T, u }: { T: Tally; u: string }) => <span className="count">{T.counts[u] || 0}</span>;

export function BoardDays({ poll, T, mine, canVote, onVote }: BoardProps) {
  const slots = new Set(poll.slots);
  return (
    <div className="months">
      {poll.months.map(mk => {
        const { y, m } = D.parseMonth(mk);
        const cells: ReactNode[] = D.DOW.map(x => <div key={`h${x}`} className="dow">{x}</div>);
        for (let i = 0, first = D.dowMon(new Date(y, m, 1)); i < first; i++) cells.push(<div key={`e${i}`} className="cell empty"></div>);
        for (let d = 1, n = D.daysInMonth(y, m); d <= n; d++) {
          const k = D.dayKey(y, m, d), on = slots.has(k);
          cells.push(
            <div key={k} className={cls("cell", `n${T.opts.length}`, !on && "off")}>
              <div className="day">{d}</div>
              {T.opts.map((o, i) => {
                const u = unitKey(k, o.id);
                return (
                  <VoteBtn key={o.id} base={`opt c${i}`} u={u} T={T} mine={mine} enabled={on && canVote}
                    label={`${D.fmtDayLong(k)} · ${o.name}`} onVote={onVote}>
                    <span className="label">{o.icon}</span>{on && <Count T={T} u={u} />}
                  </VoteBtn>
                );
              })}
            </div>,
          );
        }
        return <div key={mk} className="month"><h2>{D.fmtMonth(mk)}</h2><div className="grid">{cells}</div></div>;
      })}
    </div>
  );
}

export function BoardWeeks({ poll, T, mine, canVote, onVote }: BoardProps) {
  const slots = new Set(poll.slots);
  return (
    <div className="months">
      {poll.months.map(mk => {
        const { y, m } = D.parseMonth(mk);
        return (
          <div key={mk} className="month">
            <h2>{D.fmtMonth(mk)}</h2>
            <div className="whead"><span></span>{D.DOW.map(x => <span key={x}>{x}</span>)}<span></span></div>
            <div className="wrows">
              {D.monthWeeks(y, m).map(w => {
                const on = slots.has(w.key), u = unitKey(w.key, "v");
                return (
                  <VoteBtn key={w.key} base={cls("wrow", !on && "off")} u={u} T={T} mine={mine} enabled={on && canVote}
                    label={D.fmtWeek(w.key)} onVote={onVote}>
                    <span className="wnum">S{w.num}</span>
                    {w.days.map(d => <span key={d.key} className={cls("wd", !d.inMonth && "out")}>{d.d}</span>)}
                    <span className="wcount">{on && <Count T={T} u={u} />}</span>
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
      <div key={y} className="year-board">
        <h2>{y}</h2>
        <div className="mtiles">
          {D.MNAMES.map((name, m) => {
            const k = D.monthKey(Number(y), m), on = slots.has(k), u = unitKey(k, "v");
            return (
              <VoteBtn key={k} base={cls("mtile", !on && "off")} u={u} T={T} mine={mine} enabled={on && canVote}
                label={D.fmtMonth(k)} onVote={onVote}>
                <span className="mname">{name}</span>{on && <Count T={T} u={u} />}
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
    <div className="hours-card">
      <div className="hours-wrap">
        <table className="htable">
          <thead>
            <tr>
              <th className="corner"></th>
              {days.map(d => {
                const dt = D.parseDay(d);
                return (
                  <th key={d} scope="col">
                    <span className="hd-dow">{D.DSHORT[D.dowMon(dt)]}</span>
                    <span className="hd-day">{dt.getDate()}</span>
                    <span className="hd-mon">{D.MSHORT[dt.getMonth()]}</span>
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
                      <VoteBtn base={cls("hcell", !has && "off")} u={u} T={T} mine={mine} enabled={has && canVote}
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
    <div className="choices-card">
      <div className="choices">
        {(poll.options || []).map(o => {
          const u = unitKey(o.id, "v");
          return (
            <VoteBtn key={o.id} base="choice" u={u} T={T} mine={mine} enabled={canVote} label={o.name} onVote={onVote}>
              <span className="choice-icon" aria-hidden="true">{o.icon || DEFAULT_CHOICE_ICON}</span>
              <span className="choice-name">{o.name}</span>
              <Count T={T} u={u} />
            </VoteBtn>
          );
        })}
      </div>
    </div>
  );
}
