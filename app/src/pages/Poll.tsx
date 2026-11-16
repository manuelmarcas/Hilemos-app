// Pantalla de una votación: calendario, recuentos, desempate y participantes.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import * as D from "../lib/dates";
import {
  TYPE, TOP_N, tally, tiebreakTally, unitKey, unitParts, slotLabel, slotShort, pollRange, plural,
  type Person, type Tally, type TiebreakTally,
} from "../lib/model";
import type { Poll, Vote, Votes } from "../lib/types";
import { cls, errMsg, pollUrl } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { navigate } from "../state/route";
import { Avatar } from "../components/Avatar";

// Cada cuánto se actualiza "abierta por última vez" en el menú del usuario.
const OPENED_EVERY = 10 * 60_000;

export function PollPage({ id }: { id: string }) {
  const { store, user, library, pollCache } = useSession();
  const { toast, confirm, share } = useUi();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollLoaded, setPollLoaded] = useState(false);
  const [votes, setVotes] = useState<Votes>({});
  const [votesLoaded, setVotesLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [fatal, setFatal] = useState("");
  const [openPeople, setOpenPeople] = useState<Set<string>>(() => new Set()); // participantes con sus votos desplegados
  const [openVoters, setOpenVoters] = useState<Set<string>>(() => new Set()); // "más votadas" con quién las votó
  const joined = useRef(false);
  const lib = library.data;

  useEffect(() => store.watchPoll(id,
    p => { setPoll(p); setPollLoaded(true); pollCache.set(id, p); },
    e => setFatal(errMsg(e))), [store, id, pollCache]);
  useEffect(() => store.watchVotes(id,
    v => { setVotes(v); setVotesLoaded(true); },
    e => setStatus(errMsg(e))), [store, id]);
  useEffect(() => { if (library.error) setStatus(errMsg(library.error)); }, [library.error]);

  // Al entrar: el usuario queda como participante y la votación pasa a su colección.
  useEffect(() => {
    if (!pollLoaded || !votesLoaded || !lib) return;
    const entry = lib.polls[id];
    if (!poll) {
      if (entry) store.removeLibraryEntry(user.uid, id).catch(() => {});
      return;
    }
    if (joined.current) {
      if (entry && entry.title !== poll.title) store.saveLibraryEntry(user.uid, id, { title: poll.title }).catch(() => {});
      return;
    }
    joined.current = true;
    // Nombre y miniatura se copian en el voto; solo se reescriben si han cambiado.
    const me = votes[user.uid];
    if (!me || me.name !== user.name || (me.photo || "") !== user.thumb) {
      store.joinPoll(id, { uid: user.uid, name: user.name, photo: user.thumb })
        .catch(e => setStatus("No se pudo registrar tu participación. " + errMsg(e)));
    }
    const base = {
      title: poll.title, type: poll.type, ownerName: poll.ownerName || "",
      role: poll.ownerUid === user.uid ? "owner" as const : "participant" as const,
    };
    const now = Date.now();
    if (!entry) {
      store.saveLibraryEntry(user.uid, id, { ...base, groupId: null, addedAt: now, openedAt: now })
        .then(() => { if (poll.ownerUid !== user.uid) toast("Votación añadida a tu menú"); })
        .catch(e => setStatus(errMsg(e)));
      return;
    }
    // Ya estaba en el menú: solo se escribe si algo ha cambiado o si hace más de 10 min que se abrió
    // (openedAt ordena "Mis votaciones"; no hace falta reescribirlo en cada visita).
    const changed = (Object.keys(base) as (keyof typeof base)[]).some(k => (entry[k] ?? "") !== base[k]);
    if (changed || now - (entry.openedAt || 0) > OPENED_EVERY) {
      store.saveLibraryEntry(user.uid, id, { ...base, openedAt: now }).catch(e => setStatus(errMsg(e)));
    }
  }, [pollLoaded, votesLoaded, lib, poll, votes, id, store, user, toast]);

  if (fatal) {
    return <><div className="empty-box error">{fatal}</div><p><a href="#/">← Volver a mis votaciones</a></p></>;
  }
  if (!pollLoaded) return <div className="loading">Cargando votación…</div>;
  if (!poll) {
    return <><div className="empty-box">Esta votación no existe o ha sido eliminada.</div><p><a href="#/">← Volver a mis votaciones</a></p></>;
  }

  const t = TYPE[poll.type];
  // Uno mismo se ve siempre con su nombre e imagen actuales (los de los demás vienen copiados en su voto).
  const shown: Votes = votes[user.uid] ? { ...votes, [user.uid]: { ...votes[user.uid], name: user.name, photo: user.photo } } : votes;
  const T = tally(poll, shown);
  const TB = tiebreakTally(poll, shown);
  const byUid = Object.fromEntries(T.people.map(p => [p.uid, p]));
  const mine = new Set(votes[user.uid]?.picks || []);
  const isOwner = poll.ownerUid === user.uid;
  const canVote = !poll.closed;

  // Cambia el voto propio al momento y lo guarda; si falla, se deshace.
  async function optimistic(patch: Vote, save: () => Promise<void>, errPrefix: string) {
    const prev = votes[user.uid];
    setVotes(v => ({ ...v, [user.uid]: { ...(prev || {}), ...patch } }));
    setStatus("");
    try {
      await save();
    } catch (e) {
      setVotes(v => ({ ...v, [user.uid]: prev }));
      setStatus(errPrefix + errMsg(e));
    }
  }

  function toggle(u: string) {
    if (!poll || poll.closed) return;
    const picks = new Set((votes[user.uid]?.picks || []).filter(p => T.valid.has(p)));
    picks.has(u) ? picks.delete(u) : picks.add(u);
    const data = { name: user.name, photo: user.thumb, picks: [...picks].sort(), updatedAt: Date.now() };
    optimistic(data, () => store.saveVote(id, user.uid, data), "No se pudo guardar el voto. ");
  }

  function tiebreakVote(u: string) {
    const tb = poll?.tiebreak;
    if (!tb || tb.done) return;
    const cur = votes[user.uid]?.tb;
    const next = cur?.id === tb.id && cur.pick === u ? null : { id: tb.id, pick: u }; // pulsar la elegida la quita
    optimistic({ tb: next }, () => store.saveTiebreakVote(id, user.uid, { name: user.name, photo: user.thumb, tb: next }),
      "No se pudo guardar el voto del desempate. ");
  }

  const toggleIn = (setter: typeof setOpenPeople, k: string) => setter(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const act = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (err) { setStatus(errMsg(err)); }
  };

  const closeOrReopen = () => act(async () => {
    if (!poll.closed && !(await confirm({
      title: "¿Cerrar la votación?",
      message: "Nadie podrá votar ni cambiar sus votos. Los resultados seguirán visibles y podrás reabrirla cuando quieras.",
      confirmLabel: "Cerrar votación",
    }))) return;
    if (poll.closed && poll.tiebreak && !(await confirm({
      title: "¿Reabrir la votación?",
      message: "Se anulará el desempate y sus votos, porque al reabrir el recuento puede cambiar.",
      confirmLabel: "Reabrir y anular desempate",
      danger: true,
    }))) return;
    await store.updatePoll(id, poll.closed ? { closed: false, tiebreak: null } : { closed: true });
    toast(poll.closed ? "Votación reabierta" : "Votación cerrada");
  });

  const tbStart = () => act(async () => {
    const leaders = T.leaders;
    if (leaders.length < 2) return;
    if (!(await confirm({
      title: "¿Abrir un desempate?",
      message: `Se cerrará la votación principal y cada participante podrá elegir solo una de las ${leaders.length} opciones empatadas en el primer puesto.`,
      confirmLabel: "Abrir desempate",
    }))) return;
    await store.updatePoll(id, { closed: true, tiebreak: { id: Date.now(), candidates: leaders.slice(0, 50).map(e => e.key), done: false, round: 1 } });
    toast("Desempate abierto");
  });

  const tbFinish = () => act(async () => {
    if (!(await confirm({
      title: "¿Finalizar el desempate?",
      message: "Ya no se podrá votar en él y se mostrará el resultado.",
      confirmLabel: "Finalizar",
    }))) return;
    await store.updatePoll(id, { tiebreak: { ...poll.tiebreak!, done: true, finishedAt: Date.now() } });
    toast("Desempate finalizado");
  });

  const tbRepeat = () => act(async () => {
    if (!TB || TB.leaders.length < 2) return;
    if (!(await confirm({
      title: "¿Repetir el desempate?",
      message: `Nueva ronda solo entre las ${TB.leaders.length} opciones que siguen empatadas. Cada persona vuelve a elegir una.`,
      confirmLabel: "Repetir desempate",
    }))) return;
    await store.updatePoll(id, { tiebreak: { id: Date.now(), candidates: TB.leaders, done: false, round: (poll.tiebreak?.round || 1) + 1 } });
    toast("Nueva ronda de desempate");
  });

  const tbCancel = () => act(async () => {
    if (!(await confirm({
      title: poll.tiebreak?.done ? "¿Quitar el desempate?" : "¿Anular el desempate?",
      message: "Se borrará el desempate y sus votos. La votación principal seguirá cerrada; puedes reabrirla si quieres.",
      confirmLabel: poll.tiebreak?.done ? "Quitar" : "Anular",
      danger: true,
    }))) return;
    await store.updatePoll(id, { tiebreak: null });
    toast("Desempate anulado");
  });

  const makeAnon = () => act(async () => {
    if (!(await confirm({
      title: "¿Hacer anónima la votación?",
      message: "Dejará de mostrarse qué ha votado cada persona; solo se verán los totales. No se puede deshacer, para no destapar votos que se hicieron como anónimos.",
      confirmLabel: "Hacer anónima",
    }))) return;
    await store.updatePoll(id, { anonymous: true });
    toast("La votación ahora es anónima");
  });

  const remove = () => act(async () => {
    if (!(await confirm({
      title: `¿Eliminar «${poll.title}»?`,
      message: "Se borrarán la votación y todos sus votos para todos los participantes. No se puede deshacer.",
      confirmLabel: "Eliminar",
      danger: true,
    }))) return;
    await store.deletePoll(id, user.uid);
    toast("Votación eliminada");
    navigate("/");
  });

  const boardProps: BoardProps = { poll, T, mine, canVote, onVote: toggle };
  const board = {
    days: <BoardDays {...boardProps} />,
    weeks: <BoardWeeks {...boardProps} />,
    months: <BoardMonths {...boardProps} />,
    hours: <BoardHours {...boardProps} />,
  }[poll.type];

  return (
    <>
      <div className="poll-head">
        <div className="poll-title">
          <div className="kicker">
            {t.icon} Votación por {t.name.toLowerCase()} · creada por {isOwner ? "ti" : poll.ownerName || "alguien"} · 👥 {plural(T.people.length, ["participante", "participantes"])}
          </div>
          <div className="mode-line">
            <span className={`mode-pill ${poll.anonymous ? "anon" : ""}`}>{poll.anonymous ? "🕶️ Anónima" : "👁️ Votos visibles"}</span>
            {isOwner && !poll.anonymous && <button className="link-btn" onClick={makeAnon}>Hacer anónima</button>}
          </div>
          <h1>{poll.title}</h1>
          {poll.description && <p className="desc">{poll.description}</p>}
        </div>
        <div className={`poll-actions ${isOwner ? "owner" : ""}`}>
          <button className="btn primary" onClick={() => share({ url: pollUrl(id), title: poll.title })}>
            <span aria-hidden="true">🔗</span> Compartir
          </button>
          {isOwner && <>
            <button className="btn" onClick={closeOrReopen}>
              {poll.closed
                ? <><span aria-hidden="true">🔓</span> Reabrir</>
                : <><span aria-hidden="true">🔒</span> Cerrar<span className="lbl-long"> votación</span></>}
            </button>
            <button className="btn danger" onClick={remove}><span aria-hidden="true">🗑️</span> Eliminar</button>
          </>}
        </div>
      </div>
      {poll.closed && (
        <div className="closed-banner">
          🔒 Votación cerrada: ya no se pueden cambiar los votos{TB && !TB.done ? ". Hay un desempate abierto justo debajo" : ""}.
        </div>
      )}
      <div className="poll-info">
        {!poll.closed && <p className="poll-sub">{instructions(poll, T)}</p>}
        <p className="poll-note">
          {pollRange(poll)} {poll.anonymous
            ? "Es anónima: nadie ve qué ha votado cada persona, solo los totales."
            : "Los demás participantes pueden ver qué ha votado cada uno."}
        </p>
        <div className="legend"><Legend poll={poll} T={T} /></div>
      </div>
      <div className="status" id="poll-status" role="alert">{status}</div>
      {TB && (
        <TiebreakCard poll={poll} T={T} TB={TB} myTb={votes[user.uid]?.tb} isOwner={isOwner} byUid={byUid}
          onVote={tiebreakVote} onFinish={tbFinish} onRepeat={tbRepeat} onCancel={tbCancel} />
      )}
      {board}
      <section className="summary">
        <div className="summary-head">
          <h2>🏆 Opciones más votadas</h2>
          {T.leaders.length > 1 && !TB && isOwner && <button className="btn small" onClick={tbStart}>⚖️ Desempatar</button>}
        </div>
        {T.leaders.length > 1 && !TB && (
          <p className="summary-note">
            Hay {T.leaders.length} opciones empatadas en el primer puesto.{isOwner
              ? " Puedes abrir un desempate en el que cada persona elige solo una."
              : " Quien creó la votación puede abrir un desempate."}
          </p>
        )}
        <div className="summary-list">
          <Summary poll={poll} T={T} TB={TB} openVoters={openVoters} byUid={byUid} onToggle={k => toggleIn(setOpenVoters, k)} />
        </div>
      </section>
      <section className="results">
        <h2>👥 Participantes <span className="muted">({T.people.length})</span></h2>
        {!poll.anonymous && T.people.some(p => p.total) && <p className="table-hint">Pulsa en un nombre para ver qué ha votado.</p>}
        <div className="table-wrap">
          <PeopleTable poll={poll} T={T} me={user.uid} openPeople={openPeople} onToggle={k => toggleIn(setOpenPeople, k)} />
        </div>
      </section>
    </>
  );
}

// ---------- Textos ----------

// Cómo se vota (con la votación cerrada no se muestra: ya lo dice el aviso rojo).
function instructions(poll: Poll, T: Tally) {
  switch (poll.type) {
    case "days":
      return T.opts.length === 1
        ? `Pulsa en ${T.opts[0].icon} los días que te vengan bien.`
        : `Cada día disponible tiene ${T.opts.length} opciones (de arriba abajo: ${T.opts.map(o => `${o.icon} ${o.name}`).join(", ")}). Pulsa en las que te vengan bien.`;
    case "weeks": return "Pulsa en las semanas que te vengan bien.";
    case "months": return "Pulsa en los meses que te vengan bien.";
    case "hours": {
      const step = poll.hourStep || 60;
      return `Pulsa en las franjas horarias que te vengan bien (cada una dura ${step % 60 ? `${step} minutos` : plural(step / 60, ["hora", "horas"])}).`;
    }
  }
}

function Legend({ poll, T }: { poll: Poll; T: Tally }) {
  const best = <span className="lg"><span className="sw best"></span>Borde verde: la más votada</span>;
  if (poll.type === "days") {
    return <>
      {T.opts.map((o, i) => <span key={o.id} className="lg"><span className={`sw c${i}`}></span>{o.icon} {o.name}</span>)}
      {best}
    </>;
  }
  return <>
    <span className="lg"><span className="sw c0"></span>Tu voto</span>
    <span className="lg"><span className="count">3</span>Votos de todos</span>
    {best}
  </>;
}

function Summary({ poll, T, TB, openVoters, byUid, onToggle }: {
  poll: Poll; T: Tally; TB: TiebreakTally | null; openVoters: Set<string>; byUid: Record<string, Person>; onToggle: (k: string) => void;
}) {
  if (!T.top.length) return <div className="summary-empty">Todavía no hay votos suficientes.</div>;
  const tag = (e: Tally["top"][number]) => (poll.type === "days" ? `${e.opt.icon} ${e.opt.name}` : TYPE[poll.type].icon);
  const tbWinner = TB?.done && TB.leaders.length === 1 ? TB.leaders[0] : null;
  const more = T.ranking.length - T.top.length;
  return <>
    {T.top.map(e => {
      const u = e.key;
      const votes = plural(e.votes, ["voto", "votos"]);
      const open = !poll.anonymous && openVoters.has(u);
      return (
        <div key={u} className={`summary-row ${e.rank === 1 ? "first" : ""}`}>
          <div className="sr-main">
            <span className="rank" title={`Puesto ${e.rank}`}>{e.rank}º</span>
            <span className={`tag-best ${poll.type === "days" ? "" : "icon-only"}`}>{tag(e)}</span>
            <span className="what">{slotLabel(poll, e.slot)}</span>
            {u === tbWinner && <span className="tb-badge">⚖️ Ganó el desempate</span>}
          </div>
          {poll.anonymous
            ? <span className="votes">{votes}</span>
            : (
              <button className="votes votes-btn" aria-expanded={open} title="Ver quién lo ha votado" onClick={() => onToggle(u)}>
                👥 {votes} <span className="caret" aria-hidden="true">▾</span>
              </button>
            )}
          {open && (
            <div className="voters">
              {(T.voters[u] || []).map(uid => byUid[uid]).filter(Boolean)
                .sort((a, b) => a.name.localeCompare(b.name, "es"))
                .map(p => <span key={p.uid} className="voter"><Avatar name={p.name} photo={p.photo} size={22} seed={p.uid} />{p.name}</span>)}
            </div>
          )}
        </div>
      );
    })}
    {more > 0 && <p className="summary-more">Y {plural(more, ["opción más", "opciones más"])} con votos (las {TOP_N} primeras se muestran arriba).</p>}
  </>;
}

// ---------- Desempate ----------

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

function TiebreakCard({ poll, T, TB, myTb, isOwner, byUid, onVote, onFinish, onRepeat, onCancel }: {
  poll: Poll; T: Tally; TB: TiebreakTally; myTb: Vote["tb"]; isOwner: boolean; byUid: Record<string, Person>;
  onVote: (u: string) => void; onFinish: () => void; onRepeat: () => void; onCancel: () => void;
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
        <h2>⚖️ Desempate{(TB.round || 1) > 1 ? ` · ronda ${TB.round}` : ""}</h2>
        <span className="tb-state">{done ? "Finalizado" : `Abierto · ${plural(TB.total, ["voto", "votos"])}`}</span>
      </div>
      <p className="tb-sub">{sub}</p>
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
      {isOwner && (
        <div className="tb-actions">
          {done ? <>
            {stillTied && <button className="btn small" onClick={onRepeat}>⚖️ Repetir entre las empatadas</button>}
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

// ---------- Participantes ----------

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

function PeopleTable({ poll, T, me, openPeople, onToggle }: {
  poll: Poll; T: Tally; me: string; openPeople: Set<string>; onToggle: (uid: string) => void;
}) {
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
        {T.people.length ? T.people.map(p => {
          const who = <>
            <Avatar name={p.name} photo={p.photo} size={26} seed={p.uid} />
            <span>
              {p.name}
              {p.uid === me && <> <span className="muted">(tú)</span></>}
              {!anon && !p.total && <> <span className="muted">· aún no ha votado</span></>}
            </span>
          </>;
          if (anon) {
            return (
              <tr key={p.uid}>
                <td><span className="person">{who}</span></td>
                <td className="n">{p.total ? "✓ Sí" : <span className="muted">Aún no</span>}</td>
              </tr>
            );
          }
          const open = openPeople.has(p.uid) && p.total > 0;
          return (
            <Fragment key={p.uid}>
              <tr className={open ? "open" : ""}>
                <td>
                  {p.total
                    ? (
                      <button className="person person-btn" aria-expanded={open} onClick={() => onToggle(p.uid)}>
                        <span className="caret" aria-hidden="true">▸</span>{who}
                      </button>
                    )
                    : <span className="person person-idle">{who}</span>}
                </td>
                {multi ? T.opts.map(o => <td key={o.id} className="n">{p.perOpt[o.id]}</td>) : <td className="n">{p.total}</td>}
              </tr>
              {open && <tr className="pv-row"><td colSpan={cols}><PersonVotes poll={poll} T={T} picks={p.picks} /></td></tr>}
            </Fragment>
          );
        }) : <tr><td colSpan={cols}>Todavía no ha entrado nadie.</td></tr>}
      </tbody>
    </table>
  );
}

// ---------- Tableros ----------

interface BoardProps {
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

function BoardDays({ poll, T, mine, canVote, onVote }: BoardProps) {
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

function BoardWeeks({ poll, T, mine, canVote, onVote }: BoardProps) {
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

function BoardMonths({ poll, T, mine, canVote, onVote }: BoardProps) {
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

function BoardHours({ poll, T, mine, canVote, onVote }: BoardProps) {
  const days = poll.slots;
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
            {(poll.hours || []).map(h => (
              <tr key={h}>
                <th scope="row">{h}</th>
                {days.map(d => {
                  const s = `${d}T${h}`, u = unitKey(s, "v");
                  return (
                    <td key={d}>
                      <VoteBtn base="hcell" u={u} T={T} mine={mine} enabled={canVote} label={slotLabel(poll, s)} onVote={onVote}>
                        <Count T={T} u={u} />
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
