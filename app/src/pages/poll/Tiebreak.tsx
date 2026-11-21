// Desempate: la tarjeta para votar (una sola opción entre las empatadas) y su ajuste cuando alguien se va.
import { useEffect, useRef, type ReactNode } from "react";
import { plural, slotLabel, unitParts, type Person, type Tally, type TiebreakTally } from "../../lib/model";
import type { Poll, Vote } from "../../lib/types";
import { cls } from "../../lib/util";
import { useSession } from "../../state/session";
import { useUi } from "../../state/ui";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";

/** «🍽️ Comida · Viernes 18 de diciembre» (o solo la casilla, si la votación no es de días). */
function unitText(poll: Poll, T: Tally, u: string) {
  const { slot, optId } = unitParts(u);
  const o = T.opts.find(x => x.id === optId);
  return poll.type === "days" && o ? `${o.icon} ${o.name} · ${slotLabel(poll, slot)}` : slotLabel(poll, slot);
}

function AvatarStack({ uids, byUid }: { uids: string[]; byUid: Record<string, Person> }) {
  const ps = uids.map(u => byUid[u]).filter(Boolean);
  if (!ps.length) return null;
  return (
    <span className="av-stack" title={ps.map(p => p.name).join(", ")}>
      {ps.slice(0, 5).map(p => <Avatar key={p.uid} name={p.name} photo={p.photo} size={22} seed={p.uid} />)}
      {ps.length > 5 && <span className="av-more">+{ps.length - 5}</span>}
    </span>
  );
}

/** Tarjeta del desempate. `canManage`: quien administra la votación ve el pie para finalizarlo, repetirlo o quitarlo. */
export function TiebreakCard({ poll, T, TB, myTb, canManage, byUid, onVote, onFinish, onRepeat, onCancel, remind }: {
  poll: Poll; T: Tally; TB: TiebreakTally; myTb: Vote["tb"]; canManage: boolean; byUid: Record<string, Person>;
  onVote: (u: string) => void; onFinish: () => void; onRepeat: () => void; onCancel: () => void; remind: ReactNode;
}) {
  const done = !!TB.done;
  const myPick = myTb?.id === TB.id ? myTb.pick : null;
  const winner = done && TB.leaders.length === 1 ? TB.leaders[0] : null;
  const stillTied = done && TB.leaders.length > 1;
  let sub: ReactNode;
  if (done) {
    sub = winner
      ? <>Ganadora: <strong>{unitText(poll, T, winner)}</strong> ({plural(TB.max, ["voto", "votos"])}).</>
      : TB.total ? "Sigue el empate entre las opciones marcadas." : "Nadie votó en el desempate.";
  } else {
    sub = <>Hay empate en el primer puesto. Elige <strong>una sola</strong> opción{myPick ? " (puedes cambiarla mientras siga abierto)" : ""}.</>;
  }
  return (
    <section className={`tiebreak ${done ? "done" : ""}`}>
      <div className="tb-head">
        <h2><Icon name="scale" /> Desempate{(TB.round || 1) > 1 ? ` · ronda ${TB.round}` : ""}</h2>
        <span className="tb-state">{done ? "Finalizado" : `Abierto · ${plural(TB.total, ["voto", "votos"])}`}</span>
      </div>
      <p className="tb-sub">{sub}</p>
      {/* Como en «Participantes»: el aviso va encima de la lista a la que se refiere, no con los botones de gestión. */}
      {!done && <div className="tb-tools">{remind}</div>}
      <div className="tb-options">
        {TB.candidates.map(u => {
          const { optId } = unitParts(u);
          const idx = Math.max(0, T.opts.findIndex(o => o.id === optId));
          const isWin = done && TB.max > 0 && TB.leaders.includes(u);
          return (
            <button key={u} className={cls("tb-opt", u === myPick && "on", isWin && "win")} aria-pressed={u === myPick}
              disabled={done} onClick={() => onVote(u)}>
              <span className="tb-radio" aria-hidden="true"></span>
              <span className="tb-label">{poll.type === "days" && <span className={`sw c${idx}`}></span>}{unitText(poll, T, u)}</span>
              {!poll.anonymous && <AvatarStack uids={TB.voters[u]} byUid={byUid} />}
              <span className="count">{TB.counts[u]}</span>
            </button>
          );
        })}
      </div>
      {canManage && (
        <div className="tb-actions">
          {done ? <>
            {stillTied && <button className="btn small" onClick={onRepeat}><Icon name="scale" /> Repetir entre las empatadas</button>}
            <button className="link-btn danger" onClick={onCancel}>Quitar desempate</button>
          </> : <>
            <button className="btn small primary" onClick={onFinish}>Finalizar desempate</button>
            <button className="link-btn danger" onClick={onCancel}>Anular</button>
          </>}
        </div>
      )}
    </section>
  );
}

/**
 * Si alguien sale (o elimina su cuenta) durante un desempate, sus votos se borran y el empate puede cambiar.
 * Quien sale no puede tocar el desempate (no es administrador), así que lo ajusta el primer administrador que abre
 * la votación: sin empate, se quita el desempate y queda la ganadora; con empate entre menos opciones, sigue solo
 * entre esas (los votos ya hechos a las que siguen valen); si el empate es el mismo, no cambia nada.
 */
export function TiebreakGuard({ id, poll, T, active }: { id: string; poll: Poll; T: Tally; active: boolean }) {
  const { store } = useSession();
  const { toast } = useUi();
  const tb = poll.tiebreak;
  const leaders = T.leaders.map(e => e.key).slice(0, 50);
  const busy = useRef(false);
  const leadersKey = leaders.join("|");
  const candKey = tb?.candidates.join("|") || "";
  useEffect(() => {
    if (!active || !poll.closed || !tb || tb.done || busy.current) return;
    const cands = tb.candidates;
    if (leaders.length === cands.length && leaders.every(k => cands.includes(k))) return;
    busy.current = true;
    const solved = leaders.length < 2;
    store.updatePoll(id, { tiebreak: solved ? null : { ...tb, candidates: leaders } })
      .then(() => toast(solved
        ? "Alguien ha salido y ya no hay empate: se ha quitado el desempate y queda la ganadora."
        : "Alguien ha salido: el desempate sigue solo entre las opciones que quedan empatadas."))
      .catch(() => { /* lo intentará el siguiente administrador */ })
      .finally(() => { busy.current = false; });
  }, [active, poll.closed, tb?.id, tb?.done, candKey, leadersKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
