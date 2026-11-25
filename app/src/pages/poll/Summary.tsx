// Textos de la votación (cómo se vota y leyenda) y «Más votadas»: el ranking con quién votó cada opción.
import { TOP_N, TYPE, plural, slotLabel, type Person, type Tally, type TiebreakTally } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";

// Cómo se vota (con la votación cerrada no se muestra: ya lo dice el aviso rojo).
export function instructions(poll: Poll, T: Tally) {
  switch (poll.type) {
    case "days":
      return T.opts.length === 1
        ? `Pulsa en ${T.opts[0].icon} los días que te vengan bien.`
        : "Pulsa en las opciones de cada día que te vengan bien.";
    case "weeks": return "Pulsa en las semanas que te vengan bien.";
    case "months": return "Pulsa en los meses que te vengan bien.";
    case "options": return "Pulsa en las opciones que te gusten. Puedes elegir varias.";
    case "hours": {
      if (poll.hourList) return "Pulsa en las horas que te vengan bien.";
      const step = poll.hourStep || 60;
      return `Pulsa en las franjas horarias que te vengan bien (cada una dura ${step % 60 ? `${step} minutos` : plural(step / 60, ["hora", "horas"])}).`;
    }
  }
}

export function Legend({ poll, T }: { poll: Poll; T: Tally }) {
  const best = <span className="legend__item"><span className="swatch swatch--best"></span>Borde verde: la más votada</span>;
  if (poll.type === "days") {
    return <>
      {T.opts.map((o, i) => <span key={o.id} className="legend__item"><span className={`swatch swatch--c${i}`}></span>{o.icon} {o.name}</span>)}
      {best}
    </>;
  }
  return <>
    <span className="legend__item"><span className="swatch swatch--c0"></span>Tu voto</span>
    <span className="legend__item"><span className="count">3</span>Votos de todos</span>
    {best}
  </>;
}

export function Summary({ poll, T, TB, openVoters, byUid, onToggle }: {
  poll: Poll; T: Tally; TB: TiebreakTally | null; openVoters: Set<string>; byUid: Record<string, Person>; onToggle: (k: string) => void;
}) {
  if (!T.top.length) return <div className="summary__empty">Todavía no hay votos suficientes.</div>;
  const tag = (e: Tally["top"][number]) => (poll.type === "days" ? `${e.opt.icon} ${e.opt.name}` : <Icon name={TYPE[poll.type].icon} />);
  const tbWinner = TB?.done && TB.leaders.length === 1 ? TB.leaders[0] : null;
  const more = T.ranking.length - T.top.length;
  return <>
    {T.top.map(e => {
      const u = e.key;
      const votes = plural(e.votes, ["voto", "votos"]);
      const open = !poll.anonymous && openVoters.has(u);
      return (
        <div key={u} className={`summary-row ${e.rank === 1 ? "summary-row--first" : ""}`}>
          <div className="summary-row__main">
            <span className="summary-row__rank" data-tip={`Puesto ${e.rank}`}>{e.rank}º</span>
            <span className={`summary-row__tag ${poll.type === "days" ? "" : "summary-row__tag--icon"}`}>{tag(e)}</span>
            <span className="summary-row__what">{slotLabel(poll, e.slot)}</span>
            {u === tbWinner && <span className="win-badge"><Icon name="scale" /> Ganó el desempate</span>}
          </div>
          {poll.anonymous
            ? <span className="summary-row__votes">{votes}</span>
            : (
              <button className="summary-row__votes votes-btn" aria-expanded={open} data-tip="Ver quién lo ha votado" onClick={() => onToggle(u)}>
                <Icon name="users" /> {votes} <span className="votes-btn__caret" aria-hidden="true">▾</span>
              </button>
            )}
          {open && (
            <div className="summary-row__voters">
              {(T.voters[u] || []).map(uid => byUid[uid]).filter(Boolean)
                .sort((a, b) => a.name.localeCompare(b.name, "es"))
                .map(p => <span key={p.uid} className="summary-row__voter"><Avatar name={p.name} photo={p.photo} size={22} seed={p.uid} />{p.name}</span>)}
            </div>
          )}
        </div>
      );
    })}
    {more > 0 && <p className="summary__more">Y {plural(more, ["opción más", "opciones más"])} con votos (las {TOP_N} primeras se muestran arriba).</p>}
  </>;
}
