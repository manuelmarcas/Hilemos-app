// Pantalla de una votación: calendario, recuentos, desempate y participantes.
import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import * as D from "../lib/dates";
import {
  TYPE, TOP_N, tally, tiebreakTally, unitKey, unitParts, slotLabel, slotShort, pollRange, plural, hoursForDay,
  MAX_PEOPLE, MAX_EMAILS, PEOPLE_FILTER_FROM, isRestricted, memberStatus, acceptedVotes, hasLimit, isFull, parseEmails,
  deadlinePassed, fmtDeadline,
  type Person, type Tally, type TiebreakTally,
} from "../lib/model";
import type { MemberStatus, Poll, Vote, Votes } from "../lib/types";
import { cls, errMsg, isAndroid, isIos, pollUrl } from "../lib/util";
import { calendarEvent, downloadIcs, googleCalendarUrl, type CalEvent } from "../lib/ics";
import { shareResultCard } from "../lib/resultImage";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { navigate } from "../state/route";
import { groupToDrop } from "../state/listActions";
import { useDuplicate } from "../state/duplicate";
import { Avatar } from "../components/Avatar";
import { RemindMissing } from "../components/RemindMissing";
import { Chat } from "../components/Chat";

export function PollPage({ id }: { id: string }) {
  const { store, user, library, pollCache } = useSession();
  const { toast, confirm, share } = useUi();
  const duplicate = useDuplicate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollLoaded, setPollLoaded] = useState(false);
  const [votes, setVotes] = useState<Votes>({});
  const [votesLoaded, setVotesLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [fatal, setFatal] = useState("");
  const [openPeople, setOpenPeople] = useState<Set<string>>(() => new Set()); // participantes con sus votos desplegados
  const [openVoters, setOpenVoters] = useState<Set<string>>(() => new Set()); // "más votadas" con quién las votó
  // Votaciones restringidas: quien no está aceptado solo puede leer su propio voto.
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [myLoaded, setMyLoaded] = useState(false);
  const [blocked, setBlocked] = useState<"" | "full" | "noaccess" | "needsaccount">("");
  const [accessOpen, setAccessOpen] = useState(false);
  // Buscador y filtro de la tabla de participantes (cuando hay muchos).
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [peopleAll, setPeopleAll] = useState(false);
  const [tab, setTab] = useState<PollTab>("summary");
  const [chatUnread, setChatUnread] = useState(0);
  const joined = useRef(false);
  const lib = library.data;

  // «Visto hasta» del chat: va en la biblioteca del usuario, así se sincroniza entre sus dispositivos.
  const inLibrary = !!lib?.polls[id];
  const chatSeenAt = lib?.polls[id]?.chatSeenAt || 0;
  const seenWritten = useRef(0);
  const markChatSeen = useCallback((at: number) => {
    if (!inLibrary || at <= seenWritten.current) return;
    seenWritten.current = at;
    store.saveLibraryEntry(user.uid, id, { chatSeenAt: at }).catch(() => { seenWritten.current = 0; });
  }, [inLibrary, store, user.uid, id]);

  const ownOnly = !!poll && isRestricted(poll) && poll.ownerUid !== user.uid;
  const canReadAll = !!poll && (!ownOnly || (!!myVote && memberStatus(myVote) === "accepted"));

  useEffect(() => store.watchPoll(id,
    p => { setPoll(p); setPollLoaded(true); pollCache.set(id, p); },
    e => setFatal(errMsg(e))), [store, id, pollCache]);
  useEffect(() => {
    if (!canReadAll) return;
    return store.watchVotes(id,
      v => { setVotes(v); setVotesLoaded(true); },
      e => setStatus(errMsg(e)));
  }, [store, id, canReadAll]);
  useEffect(() => {
    if (!ownOnly) return;
    return store.watchVote(id, user.uid,
      v => { setMyVote(v); setMyLoaded(true); },
      e => setStatus(errMsg(e)));
  }, [store, id, user.uid, ownOnly]);
  useEffect(() => { if (library.error) setStatus(errMsg(library.error)); }, [library.error]);
  // Completa: en cuanto quede una plaza libre se vuelve a intentar entrar.
  useEffect(() => {
    if (blocked === "full" && poll && !isFull(poll)) { joined.current = false; setBlocked(""); }
  }, [blocked, poll]);
  const retryJoin = () => { joined.current = false; setBlocked(""); };

  // El plazo tiene que cumplirse con la página abierta, así que se repinta al llegar la hora (si es hoy).
  const deadline = poll?.deadline || 0;
  const [, tick] = useState(0);
  useEffect(() => {
    const ms = deadline - Date.now();
    if (ms <= 0 || ms > 86400000) return;
    const t = window.setTimeout(() => tick(n => n + 1), ms + 500);
    return () => clearTimeout(t);
  }, [deadline]);

  // Al entrar: el usuario queda como participante y la votación pasa a su colección.
  useEffect(() => {
    if (!pollLoaded || !lib) return;
    const entry = lib.polls[id];
    if (!poll) {
      // Ya no existe: sale de la lista (y su grupo, si se queda vacío).
      if (entry) store.removeLibraryEntry(user.uid, id, groupToDrop(lib, id)).catch(() => {});
      return;
    }
    if (blocked || !(ownOnly ? myLoaded : votesLoaded)) return;
    if (joined.current) {
      if (entry && entry.title !== poll.title) store.saveLibraryEntry(user.uid, id, { title: poll.title }).catch(() => {});
      return;
    }
    joined.current = true;
    const isOwner = poll.ownerUid === user.uid;
    const me = ownOnly ? myVote : votes[user.uid];
    const participant = { uid: user.uid, name: user.name, photo: user.thumb };

    const addToMenu = () => {
      const base = {
        title: poll.title, type: poll.type, ownerName: poll.ownerName || "",
        role: isOwner ? "owner" as const : "participant" as const,
      };
      if (!entry) {
        store.saveLibraryEntry(user.uid, id, { ...base, groupId: null, addedAt: Date.now() })
          .then(() => { if (!isOwner) toast("Votación añadida a tu menú"); })
          .catch(e => setStatus(errMsg(e)));
        return;
      }
      // Ya estaba en el menú: solo se escribe si ha cambiado algo de lo que se muestra en él.
      const changed = (Object.keys(base) as (keyof typeof base)[]).some(k => (entry[k] ?? "") !== base[k]);
      if (changed) store.saveLibraryEntry(user.uid, id, base).catch(e => setStatus(errMsg(e)));
    };

    if (!me) {
      // Primera vez: se comprueba la plaza (y las reglas, los correos permitidos) antes de añadirla al menú.
      if (isFull(poll) && !isOwner) { setBlocked("full"); return; }
      store.joinPoll(id, participant, { isNew: true, counted: hasLimit(poll), pending: !!poll.approval && !isOwner })
        .then(addToMenu)
        .catch(e => {
          if ((e as { code?: string })?.code === "permission-denied" && !isOwner) {
            // Sin cuenta solo se puede votar en las abiertas: las restringidas necesitan Google.
            setBlocked(user.anon && isRestricted(poll) ? "needsaccount" : poll.emailsOnly ? "noaccess" : "full");
          } else {
            setStatus("No se pudo registrar tu participación. " + errMsg(e));
          }
        });
      return;
    }
    // Nombre y miniatura se copian en el voto; solo se reescriben si han cambiado.
    if (me.name !== user.name || (me.photo || "") !== user.thumb) {
      store.joinPoll(id, participant).catch(e => setStatus("No se pudo registrar tu participación. " + errMsg(e)));
    }
    addToMenu();
  }, [pollLoaded, votesLoaded, myLoaded, ownOnly, blocked, lib, poll, votes, myVote, id, store, user, toast]);

  if (fatal) {
    return <><div className="empty-box error">{fatal}</div><p><a href="#/">← Volver a mis votaciones</a></p></>;
  }
  if (!pollLoaded) return <div className="loading">Cargando votación…</div>;
  if (!poll) {
    return <><div className="empty-box">Esta votación no existe o ha sido eliminada.</div><p><a href="#/">← Volver a mis votaciones</a></p></>;
  }

  if (blocked) return <BlockedView poll={poll} kind={blocked} email={user.email} onRetry={retryJoin} />;
  if (ownOnly && !canReadAll) {
    if (!myLoaded || !myVote) return <div className="loading">Cargando votación…</div>;
    return <WaitingView poll={poll} status={memberStatus(myVote)} />;
  }

  const t = TYPE[poll.type];
  // Uno mismo se ve siempre con su nombre e imagen actuales (los de los demás vienen copiados en su voto).
  const shown: Votes = votes[user.uid] ? { ...votes, [user.uid]: { ...votes[user.uid], name: user.name, photo: user.photo } } : votes;
  // Pendientes y rechazados no cuentan en recuentos, ranking ni tabla.
  const accepted = acceptedVotes(shown);
  const T = tally(poll, accepted);
  const TB = tiebreakTally(poll, accepted);
  const requests = Object.entries(votes).filter(([, v]) => v?.status).map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => (a.seenAt || 0) - (b.seenAt || 0));
  const byUid = Object.fromEntries(T.people.map(p => [p.uid, p]));
  const mine = new Set(votes[user.uid]?.picks || []);
  const isOwner = poll.ownerUid === user.uid;
  const expired = deadlinePassed(poll);
  const canVote = !poll.closed && !expired;
  // En el chat se escribe aunque la votación esté cerrada: es cuando se remata el plan.
  const canChat = isOwner || (!!votes[user.uid] && memberStatus(votes[user.uid]) === "accepted");

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
    if (!canVote) return;
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
    // Al reabrir se quita un plazo ya pasado: si no, la votación quedaría abierta pero sin poder votar.
    await store.updatePoll(id, poll.closed ? { closed: false, tiebreak: null, ...(expired ? { deadline: 0 } : {}) } : { closed: true });
    toast(poll.closed ? "Votación reabierta" : "Votación cerrada");
  });

  const clearDeadline = () => act(async () => {
    if (!(await confirm({
      title: "¿Quitar el plazo?",
      message: "Se podrá volver a votar y la votación seguirá abierta hasta que la cierres tú.",
      confirmLabel: "Quitar el plazo",
    }))) return;
    await store.updatePoll(id, { deadline: 0 });
    toast("Plazo quitado: se puede volver a votar");
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

  const setMember = (uid: string, to: MemberStatus, from: MemberStatus) => act(async () => {
    await store.setMemberStatus(id, uid, to, { from, counted: hasLimit(poll) });
    toast(to === "accepted" ? "Aceptado: ya puede votar" : to === "rejected" ? "Solicitud rechazada" : "Solicitud pendiente");
  });

  const remove = () => act(async () => {
    if (!(await confirm({
      title: `¿Eliminar «${poll.title}»?`,
      message: "Se borrarán la votación y todos sus votos para todos los participantes. No se puede deshacer.",
      confirmLabel: "Eliminar",
      danger: true,
    }))) return;
    await store.deletePoll(id, user.uid, groupToDrop(lib, id));
    toast("Votación eliminada");
    navigate("/");
  });

  // Solo hay fecha para el calendario si no queda empate: la ganadora del desempate o la única más votada.
  const winner = TB
    ? (TB.done && TB.leaders.length === 1 ? TB.leaders[0] : null)
    : (T.leaders.length === 1 ? T.leaders[0].key : null);
  const cal = winner ? calendarEvent(poll, id, winner, pollUrl(id)) : null;

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
            {hasLimit(poll) && (isOwner || (poll.maxPeople as number) < MAX_PEOPLE) && <> (máx. {poll.maxPeople})</>}
          </div>
          <div className="mode-line">
            <span className={`mode-pill ${poll.anonymous ? "anon" : ""}`}>{poll.anonymous ? "🕶️ Anónima" : "👁️ Votos visibles"}</span>
            {poll.emailsOnly && <span className="mode-pill anon">✉️ Solo invitados</span>}
            {poll.approval && <span className="mode-pill anon">✋ Con aprobación</span>}
            {!!poll.deadline && !expired && !poll.closed && <span className="mode-pill">⏳ Se cierra el {fmtDeadline(poll.deadline)}</span>}
          </div>
          <div className="title-row">
            <h1>{poll.title}</h1>
            {isOwner && (
              <OwnerMenu closed={!!poll.closed} anonymous={!!poll.anonymous}
                onCloseOrReopen={closeOrReopen} onAnon={makeAnon} onDelete={remove}
                onDuplicate={() => duplicate(poll)}
                onAccess={hasLimit(poll) ? () => setAccessOpen(true) : undefined} />
            )}
          </div>
          {poll.description && <p className="desc">{poll.description}</p>}
          <div className="poll-actions">
            <button className="btn primary" onClick={() => share({ url: pollUrl(id), title: poll.title })}>
              <span aria-hidden="true">🔗</span> Compartir
            </button>
            {T.top.length > 0 && (
              <button className="btn" onClick={() => act(async () => {
                if (await shareResultCard(poll, T, TB) === "downloaded") toast("Imagen del resultado descargada");
              })}>
                <span aria-hidden="true">🖼️</span> Compartir resultado
              </button>
            )}
          </div>
        </div>
      </div>
      {isOwner && accessOpen && <AccessPanel poll={poll} onClose={() => setAccessOpen(false)} />}
      {isOwner && requests.length > 0 && <Requests poll={poll} requests={requests} onSet={setMember} />}
      {poll.closed && (
        <div className="closed-banner">
          🔒 Votación cerrada: ya no se pueden cambiar los votos{TB && !TB.done ? ". Hay un desempate abierto justo debajo" : ""}.
        </div>
      )}
      {!poll.closed && expired && (
        <div className="closed-banner">
          ⏳ Se acabó el plazo el {fmtDeadline(poll.deadline!)}: ya no se pueden cambiar los votos.
          {isOwner && <> <button className="link-btn" onClick={clearDeadline}>Quitar el plazo</button></>}
        </div>
      )}
      <div className="poll-info">
        {canVote && <p className="poll-sub">{instructions(poll, T)}</p>}
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
          onVote={tiebreakVote} onFinish={tbFinish} onRepeat={tbRepeat} onCancel={tbCancel}
          remind={<RemindMissing poll={poll} T={T} TB={TB} open={canVote} me={user.uid} url={pollUrl(id)} />} />
      )}
      {board}
      <PollTabs tab={tab} setTab={setTab} counts={{ people: T.people.length }} unread={tab === "chat" ? 0 : chatUnread} />
      <div className="ptab-panel" id="ptab-summary" role="tabpanel" aria-labelledby="ptabbtn-summary" hidden={tab !== "summary"}>
      <section className="summary">
        {cal && (
          <div className="summary-head">
            <CalendarMenu cal={cal} />
          </div>
        )}
        {/* El botón va con el texto que lo explica, no separado arriba junto al calendario. */}
        {T.leaders.length > 1 && !TB && (
          <div className="summary-tie">
            <p className="summary-note">
              Hay {T.leaders.length} opciones empatadas en el primer puesto.{isOwner
                ? " Puedes abrir un desempate en el que cada persona elige solo una."
                : " Quien creó la votación puede abrir un desempate."}
            </p>
            {isOwner && <button className="btn small" onClick={tbStart}>⚖️ Desempatar</button>}
          </div>
        )}
        <div className="summary-list">
          <Summary poll={poll} T={T} TB={TB} openVoters={openVoters} byUid={byUid} onToggle={k => toggleIn(setOpenVoters, k)} />
        </div>
      </section>
      </div>
      <div className="ptab-panel" id="ptab-people" role="tabpanel" aria-labelledby="ptabbtn-people" hidden={tab !== "people"}>
      <section className="results">
        {isOwner && <div className="summary-head"><RemindMissing poll={poll} T={T} TB={TB} open={canVote} me={user.uid} url={pollUrl(id)} /></div>}
        {!poll.anonymous && T.people.some(p => p.total) && <p className="table-hint">Pulsa en un nombre para ver qué ha votado.</p>}
        <PeopleList T={T} query={peopleQuery} setQuery={setPeopleQuery} filter={peopleFilter} setFilter={setPeopleFilter}
          all={peopleAll} setAll={setPeopleAll}>
          {people => (
            <div className="table-wrap">
              <PeopleTable poll={poll} T={T} people={people} me={user.uid} openPeople={openPeople} onToggle={k => toggleIn(setOpenPeople, k)} />
            </div>
          )}
        </PeopleList>
      </section>
      </div>
      <div className="ptab-panel" id="ptab-chat" role="tabpanel" aria-labelledby="ptabbtn-chat" hidden={tab !== "chat"}>
        <Chat poll={poll} id={id} votes={shown} canWrite={canChat} active={tab === "chat"}
          seenAt={chatSeenAt} onUnread={setChatUnread} onSeen={markChatSeen} />
      </div>
    </>
  );
}

// ---------- Pestañas bajo el calendario ----------

type PollTab = "summary" | "people" | "chat";

const TABS: { id: PollTab; icon: string; label: string }[] = [
  { id: "summary", icon: "🏆", label: "Más votadas" },
  { id: "people", icon: "👥", label: "Participantes" },
  { id: "chat", icon: "💬", label: "Chat" },
];

// El calendario queda siempre arriba; debajo se alterna lo demás para que la pantalla no se haga eterna.
function PollTabs({ tab, setTab, counts, unread }: {
  tab: PollTab; setTab: (t: PollTab) => void; counts: Partial<Record<PollTab, number>>; unread: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex(t => t.id === tab);
    const j = (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[j].id);
    refs.current[j]?.focus();
  }
  return (
    <div className="ptabs" role="tablist" aria-label="Qué ver debajo del calendario" onKeyDown={onKey}>
      {TABS.map((t, i) => {
        const on = tab === t.id, n = counts[t.id];
        const badge = t.id === "chat" && unread > 0 ? unread : 0;
        return (
          <button key={t.id} ref={el => { refs.current[i] = el; }} type="button" role="tab" id={`ptabbtn-${t.id}`}
            className="ptab" aria-selected={on} aria-controls={`ptab-${t.id}`} tabIndex={on ? 0 : -1} onClick={() => setTab(t.id)}
            aria-label={badge ? `${t.label}: ${plural(badge, ["mensaje sin leer", "mensajes sin leer"])}` : undefined}>
            <span className={badge > 0 ? "ptab-ico has-badge" : "ptab-ico"} aria-hidden="true">
              {t.icon}{badge > 0 && <span className="ptab-badge">{badge > 99 ? "99+" : badge}</span>}
            </span>
            <span className="ptab-label">{t.label}{n != null && <span className="n">{n}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Menú ⋯ del creador: cerrar/reabrir, hacer anónima y eliminar ----------

// Menú desplegable: se cierra al pulsar fuera o con Escape (volviendo al botón) y se recorre con las flechas.
function useMenuKeys(open: boolean, setOpen: (open: boolean) => void,
  wrap: RefObject<HTMLDivElement | null>, btn: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open) return;
    const items = () => [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [])];
    items()[0]?.focus();
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, setOpen, wrap, btn]);
}

// Un solo botón para el calendario, según el dispositivo: en Android abre Google Calendar (sin descargar nada),
// en iPhone y iPad descarga el .ics, que abre Calendario directamente, y en el ordenador deja elegir con un menú.
function CalendarMenu({ cal }: { cal: CalEvent }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useMenuKeys(open, setOpen, wrap, btn);
  const label = <><span aria-hidden="true">📅</span> Añadir al calendario</>;
  if (isAndroid()) {
    return <a className="btn small" href={googleCalendarUrl(cal)} target="_blank" rel="noopener noreferrer">{label}</a>;
  }
  if (isIos()) return <button className="btn small" onClick={() => downloadIcs(cal)}>{label}</button>;
  return (
    <div className="pm" ref={wrap}>
      <button ref={btn} className="btn small" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {label} <span className="pm-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="pm-menu start" role="menu" aria-label="Añadir al calendario">
          <a role="menuitem" className="pm-item" href={googleCalendarUrl(cal)} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}>
            <span aria-hidden="true">🌐</span>Google Calendar
          </a>
          <button role="menuitem" className="pm-item" onClick={() => { setOpen(false); downloadIcs(cal); }}>
            <span aria-hidden="true">📥</span>Apple, Outlook y otros (.ics)
          </button>
        </div>
      )}
    </div>
  );
}

function OwnerMenu({ closed, anonymous, onCloseOrReopen, onAnon, onDelete, onDuplicate, onAccess }: {
  closed: boolean; anonymous: boolean; onCloseOrReopen: () => void; onAnon: () => void; onDelete: () => void;
  onDuplicate: () => void; onAccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useMenuKeys(open, setOpen, wrap, btn);

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="pm" ref={wrap}>
      <button ref={btn} className="pm-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Opciones de la votación"
        title="Opciones de la votación" onClick={() => setOpen(o => !o)}>⋯</button>
      {open && (
        <div className="pm-menu" role="menu" aria-label="Opciones de la votación">
          <button role="menuitem" className="pm-item" onClick={pick(onCloseOrReopen)}>
            <span aria-hidden="true">{closed ? "🔓" : "🔒"}</span>{closed ? "Reabrir votación" : "Cerrar votación"}
          </button>
          {onAccess && (
            <button role="menuitem" className="pm-item" onClick={pick(onAccess)}>
              <span aria-hidden="true">⚙️</span>Acceso y plazas
            </button>
          )}
          {!anonymous && (
            <button role="menuitem" className="pm-item" onClick={pick(onAnon)}>
              <span aria-hidden="true">🕶️</span>Hacer anónima
            </button>
          )}
          <button role="menuitem" className="pm-item" onClick={pick(onDuplicate)}>
            <span aria-hidden="true">📋</span>Duplicar votación
          </button>
          <div className="pm-sep" role="separator" />
          <button role="menuitem" className="pm-item danger" onClick={pick(onDelete)}>
            <span aria-hidden="true">🗑️</span>Eliminar votación
          </button>
        </div>
      )}
    </div>
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
      if (poll.hourList) return "Pulsa en las horas que te vengan bien.";
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

function TiebreakCard({ poll, T, TB, myTb, isOwner, byUid, onVote, onFinish, onRepeat, onCancel, remind }: {
  poll: Poll; T: Tally; TB: TiebreakTally; myTb: Vote["tb"]; isOwner: boolean; byUid: Record<string, Person>;
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
        <h2>⚖️ Desempate{(TB.round || 1) > 1 ? ` · ronda ${TB.round}` : ""}</h2>
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

function PeopleTable({ poll, T, people, me, openPeople, onToggle }: {
  poll: Poll; T: Tally; people: Person[]; me: string; openPeople: Set<string>; onToggle: (uid: string) => void;
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
        {people.length ? people.map(p => {
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
        }) : <tr><td colSpan={cols}>{T.people.length ? "Nadie coincide con la búsqueda." : "Todavía no ha entrado nadie."}</td></tr>}
      </tbody>
    </table>
  );
}

// ---------- Quién puede unirse ----------

type PeopleFilter = "all" | "voted" | "novote";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Con muchos participantes: buscador, filtro (han votado / sin votar) y lista recortada con «Ver todos». */
function PeopleList({ T, query, setQuery, filter, setFilter, all, setAll, children }: {
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

/** Solicitudes pendientes (y rechazadas, para poder readmitirlas). Solo las ve el creador. */
function Requests({ poll, requests, onSet }: {
  poll: Poll; requests: (Vote & { uid: string })[]; onSet: (uid: string, to: MemberStatus, from: MemberStatus) => void;
}) {
  const pending = requests.filter(r => r.status === "pending");
  const rejected = requests.filter(r => r.status === "rejected");
  const [showRejected, setShowRejected] = useState(false);
  const full = isFull(poll);
  return (
    <section className="requests">
      <div className="rq-head">
        <h2>✋ Solicitudes {pending.length > 0 && <span className="rq-count">{pending.length}</span>}</h2>
        {rejected.length > 0 && (
          <button type="button" className="link-btn" aria-expanded={showRejected} onClick={() => setShowRejected(v => !v)}>
            {showRejected ? "Ocultar rechazadas" : `Ver rechazadas (${rejected.length})`}
          </button>
        )}
      </div>
      {pending.length > 0
        ? <p className="rq-sub">Estas personas han abierto el enlace. No pueden votar ni ver los resultados hasta que las aceptes.</p>
        : <p className="rq-sub">No hay solicitudes pendientes.</p>}
      <ul className="rq-list">
        {pending.map(r => (
          <li key={r.uid} className="rq-row">
            <span className="person"><Avatar name={r.name || "Alguien"} photo={r.photo || ""} size={30} seed={r.uid} />{r.name || "Alguien"}</span>
            <span className="rq-actions">
              <button type="button" className="btn small primary" onClick={() => onSet(r.uid, "accepted", "pending")}>Aceptar</button>
              <button type="button" className="btn small danger" onClick={() => onSet(r.uid, "rejected", "pending")}>Rechazar</button>
            </span>
          </li>
        ))}
        {showRejected && rejected.map(r => (
          <li key={r.uid} className="rq-row rejected">
            <span className="person"><Avatar name={r.name || "Alguien"} photo={r.photo || ""} size={30} seed={r.uid} />{r.name || "Alguien"}
              <span className="muted"> · rechazada</span></span>
            <span className="rq-actions">
              <button type="button" className="btn small" disabled={full} title={full ? "No quedan plazas" : undefined}
                onClick={() => onSet(r.uid, "accepted", "rejected")}>Aceptar</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ajustes del creador: plazas y, en las privadas, correos permitidos. */
function AccessPanel({ poll, onClose }: { poll: Poll; onClose: () => void }) {
  const { store } = useSession();
  const { toast } = useUi();
  const members = poll.members || 0;
  const [maxText, setMaxText] = useState(String(poll.maxPeople ?? MAX_PEOPLE));
  const [emailsText, setEmailsText] = useState("");
  const [loaded, setLoaded] = useState(!poll.emailsOnly);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!poll.emailsOnly) return;
    store.getAccess(poll.id)
      .then(a => { setEmailsText((a?.emails || []).join("\n")); setLoaded(true); })
      .catch(e => { setErr("No se pudieron leer los correos. " + errMsg(e)); setLoaded(true); });
  }, [store, poll.id, poll.emailsOnly]);

  const parsed = parseEmails(emailsText);
  const min = Math.max(2, members);
  async function save() {
    const n = Number(maxText.trim());
    if (!Number.isInteger(n) || n < min || n > MAX_PEOPLE) {
      setErr(`El máximo debe estar entre ${min} y ${MAX_PEOPLE}${members > 2 ? ` (ya hay ${members} personas dentro)` : ""}.`);
      return;
    }
    if (poll.emailsOnly) {
      if (parsed.invalid.length) { setErr("Revisa estos correos: " + parsed.invalid.slice(0, 3).join(", ")); return; }
      if (!parsed.emails.length) { setErr("Deja al menos un correo."); return; }
      if (parsed.emails.length > MAX_EMAILS) { setErr(`Como mucho ${MAX_EMAILS} correos.`); return; }
    }
    setBusy(true);
    setErr("");
    try {
      if (n !== poll.maxPeople) await store.updatePoll(poll.id, { maxPeople: n });
      if (poll.emailsOnly) await store.setAccess(poll.id, { emails: parsed.emails });
      toast("Acceso guardado");
      onClose();
    } catch (e) {
      setErr("No se pudo guardar. " + errMsg(e));
      setBusy(false);
    }
  }

  return (
    <section className="access-panel" aria-label="Acceso y plazas">
      <h2>⚙️ Acceso y plazas</h2>
      <label className="field-label" htmlFor="ap-max">Máximo de personas <span className="muted">(ahora hay {members})</span></label>
      <input id="ap-max" className="input small" type="number" inputMode="numeric" min={min} max={MAX_PEOPLE}
        value={maxText} onChange={e => setMaxText(e.target.value)} />
      {poll.emailsOnly && (
        <>
          <label className="field-label" htmlFor="ap-emails">Correos que pueden entrar</label>
          <textarea id="ap-emails" className="input" rows={4} value={emailsText} disabled={!loaded}
            onChange={e => setEmailsText(e.target.value)} spellCheck={false} />
          <p className="hint">Quitar un correo no echa a quien ya ha entrado: solo impide que entren nuevas personas con él.</p>
        </>
      )}
      <div className="status" role="alert">{err}</div>
      <div className="ap-actions">
        <button type="button" className="btn primary" disabled={busy || !loaded} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      </div>
    </section>
  );
}

function AccessHead({ poll }: { poll: Poll }) {
  const t = TYPE[poll.type];
  return (
    <div className="poll-head">
      <div className="poll-title">
        <div className="kicker">{t.icon} Votación por {t.name.toLowerCase()} · creada por {poll.ownerName || "alguien"}</div>
        <div className="title-row"><h1>{poll.title}</h1></div>
        {poll.description && <p className="desc">{poll.description}</p>}
      </div>
    </div>
  );
}

/** Quien ha pedido entrar en una votación con aprobación y aún no está aceptado. */
function WaitingView({ poll, status }: { poll: Poll; status: MemberStatus }) {
  const owner = poll.ownerName || "Quien la creó";
  return <>
    <AccessHead poll={poll} />
    <div className={`gate-note ${status}`} role="status">
      {status === "rejected" ? <>
        <h2>🚫 No te han aceptado</h2>
        <p>{owner} no ha aceptado tu solicitud para esta votación, así que no puedes votar ni ver los resultados.</p>
      </> : <>
        <h2>⏳ Pendiente de aprobación</h2>
        <p>{owner} tiene que aceptarte para que puedas votar y ver los resultados. La votación ya está en tu menú: cuando te acepte, se abrirá aquí sola.</p>
      </>}
    </div>
    <p className="poll-note">{pollRange(poll)}</p>
    <p><a href="#/">← Volver a mis votaciones</a></p>
  </>;
}

/** No se puede entrar: votación privada sin invitación, completa, o restringida y sin cuenta. */
function BlockedView({ poll, kind, email, onRetry }: {
  poll: Poll; kind: "full" | "noaccess" | "needsaccount"; email: string; onRetry: () => void;
}) {
  const { store } = useSession();
  const owner = poll.ownerName || "quien la creó";
  const [status, setStatus] = useState("");

  const login = async () => {
    setStatus("");
    try { await store.signIn(); }
    catch (e) { setStatus("No se pudo iniciar sesión. " + errMsg(e)); }
  };

  if (kind === "needsaccount") {
    return <>
      <AccessHead poll={poll} />
      <div className="gate-note blocked" role="status">
        <h2>🔑 Hace falta una cuenta</h2>
        <p>
          {poll.emailsOnly
            ? `${owner} ha limitado esta votación a unos correos concretos, así que hay que entrar con Google para comprobar el tuyo.`
            : `${owner} tiene que aceptar a cada participante, así que hay que entrar con Google para que sepa quién eres.`}
        </p>
        <button type="button" className="btn primary gate-retry" onClick={login}>Entrar con Google</button>
        <div className="status" role="alert">{status}</div>
      </div>
      <p><a href="#/">← Volver a mis votaciones</a></p>
    </>;
  }

  return <>
    <AccessHead poll={poll} />
    <div className="gate-note blocked" role="status">
      {kind === "noaccess" ? <>
        <h2>✉️ Votación privada</h2>
        <p>Solo pueden entrar las personas invitadas por {owner}. Has entrado como <strong>{email || "una cuenta sin correo"}</strong>: si te invitó con otro correo, entra con esa cuenta o pídele que añada este.</p>
        <button type="button" className="btn small gate-retry" onClick={onRetry}>Volver a intentarlo</button>
      </> : <>
        <h2>👥 Votación completa</h2>
        <p>Ya hay {poll.maxPeople} personas, {poll.maxPeople === MAX_PEOPLE ? "el máximo de cualquier votación" : `el máximo que ha puesto ${owner}`}. Si alguien deja sitio, podrás entrar.</p>
      </>}
    </div>
    <p><a href="#/">← Volver a mis votaciones</a></p>
  </>;
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
