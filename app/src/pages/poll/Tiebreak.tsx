// Desempate: la tarjeta para votar (una sola opción entre las empatadas) y su ajuste cuando alguien deja de
// participar, con un aviso que ven todos.
import { useEffect, useRef, type ReactNode } from "react";
import { plural, slotLabel, tiebreakShift, unitParts, type Person, type Tally, type TiebreakTally } from "../../lib/model";
import type { Poll, Vote } from "../../lib/types";
import { cls } from "../../lib/util";
import { useSession } from "../../state/session";
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
  // Si alguien se salió y cambió el empate, lo ven todos al entrar (la votación llega ya ajustada: ver
  // withTiebreakAdjusted). A quien había elegido una opción que sale se le pide que vuelva a elegir.
  let note: ReactNode = null;
  if (!done && poll.tbNote && !poll.tbNote.solved && poll.tbNote.tb === TB.id) {
    const lost = myTb?.id === TB.id && !TB.candidates.includes(myTb.pick);
    note = <>
      Han cambiado los votos porque una persona se ha salido de la votación: el desempate sigue solo entre
      las {TB.candidates.length} opciones que siguen empatadas.
      {lost && <> <strong>Tu elección ya no está entre ellas: vuelve a elegir.</strong></>}
    </>;
  }
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
      {note && <p className="tb-note"><Icon name="users" /><span>{note}</span></p>}
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
 * Si alguien deja de participar durante un desempate (sale, elimina su cuenta o le rechazan), sus votos dejan de
 * contar y el empate puede cambiar. Quien sale no puede tocar el desempate (no es administrador), así que lo ajusta
 * el primer administrador que abre la votación: sin empate, se quita el desempate y queda la ganadora; con empate
 * entre menos opciones, sigue solo entre esas (los votos ya hechos a las que siguen valen); si el empate es el mismo,
 * no cambia nada. A la vez deja un aviso (tbNote) para que todos sepan qué ha pasado: TiebreakCard y
 * TiebreakSolvedNote.
 */
export function TiebreakGuard({ id, poll, T, active }: { id: string; poll: Poll; T: Tally; active: boolean }) {
  const { store } = useSession();
  const tb = poll.tiebreak;
  const leaders = tiebreakShift(poll, T);
  const busy = useRef(false);
  const leadersKey = leaders?.join("|") || "";
  useEffect(() => {
    if (!active || !tb || !leaders || busy.current) return;
    busy.current = true;
    const solved = leaders.length < 2;
    const at = Date.now();
    store.updatePoll(id, solved
      ? { tiebreak: null, tbNote: { at, solved: true } }
      : { tiebreak: { ...tb, candidates: leaders }, tbNote: { at, solved: false, tb: tb.id, n: leaders.length } })
      .catch(() => { /* lo intentará el siguiente administrador */ })
      .finally(() => { busy.current = false; });
  }, [active, tb?.id, leadersKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Aviso para todos cuando el desempate ya no hace falta porque alguien se salió y ya no hay empate (tbNote, o
 * calculado con withTiebreakAdjusted). Se ve mientras la votación siga cerrada y sin desempate.
 */
export function TiebreakSolvedNote({ poll, T }: { poll: Poll; T: Tally }) {
  if (!poll.closed || poll.tiebreak || !poll.tbNote?.solved) return null;
  const winner = T.leaders.length === 1 ? unitText(poll, T, T.leaders[0].key) : null;
  return (
    <p className="tb-note tb-note-solved" role="status">
      <Icon name="scale" />
      <span>
        Han cambiado los votos porque una persona se ha salido de la votación y ya no hay empate, así que el
        desempate ya no hace falta{winner ? <>: gana <strong>{winner}</strong></> : " y gana la más votada"}.
      </span>
    </p>
  );
}
