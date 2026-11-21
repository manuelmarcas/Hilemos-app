// Pantalla de una votación: cabecera, calendario, pestañas (más votadas, participantes y chat), desempate y acceso.
// Aquí están el estado de la votación (que se escucha en directo) y sus acciones; cada parte se pinta en su archivo.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TYPE, tally, tiebreakTally, pollRange, plural, MAX_PEOPLE, isRestricted, memberStatus, acceptedVotes, hasLimit,
  isFull, deadlinePassed, fmtDeadline, isAdmin, isPresent, withTiebreakAdjusted, isFinal, repeatCandidates,
} from "../../lib/model";
import type { MemberStatus, Poll, Vote, Votes } from "../../lib/types";
import { errMsg, pollUrl } from "../../lib/util";
import { calendarEvent } from "../../lib/ics";
import { shareResultCard } from "../../lib/resultImage";
import { useSession } from "../../state/session";
import { useUi } from "../../state/ui";
import { navigate } from "../../state/route";
import { groupToDrop, useListActions } from "../../state/listActions";
import { useDuplicate } from "../../state/duplicate";
import { RemindMissing } from "../../components/RemindMissing";
import { Chat } from "../../components/Chat";
import { Icon } from "../../components/Icon";
import { BoardDays, BoardHours, BoardMonths, BoardOptions, BoardWeeks, type BoardProps } from "./Boards";
import { Legend, Summary, instructions } from "./Summary";
import { TiebreakCard, TiebreakGuard, TiebreakSolvedNote, unitText } from "./Tiebreak";
import { GonePeople, PeopleList, PeopleTable, type PeopleFilter } from "./People";
import { AccessPanel, BlockedView, Requests, WaitingView } from "./Access";
import { CalendarMenu, OwnerMenu } from "./Menus";
import { PollTabs, type PollTab } from "./PollTabs";

export function PollPage({ id }: { id: string }) {
  const { store, user, library, pollCache } = useSession();
  const { toast, confirm, share } = useUi();
  const duplicate = useDuplicate();
  const { leave: leavePoll } = useListActions();
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

  const ownOnly = !!poll && isRestricted(poll) && !isAdmin(poll, user.uid);
  const canReadAll = !!poll && (!ownOnly || (!!myVote && memberStatus(myVote) === "accepted"));

  // ---------- Datos en directo: la votación y los votos (o solo el propio, en las restringidas) ----------
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
    // Nombre y miniatura se copian en el voto; solo se reescriben si han cambiado o si vuelve después de haberse ido
    // (joinPoll le quita «gone»: sus votos y sus mensajes vuelven a llevar su nombre).
    if (me.gone || me.name !== user.name || (me.photo || "") !== user.thumb) {
      store.joinPoll(id, participant).catch(e => setStatus("No se pudo registrar tu participación. " + errMsg(e)));
    }
    addToMenu();
  }, [pollLoaded, votesLoaded, myLoaded, ownOnly, blocked, lib, poll, votes, myVote, id, store, user, toast]);

  if (fatal) {
    return <><div className="empty-box error">{fatal}</div><p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p></>;
  }
  if (!pollLoaded) return <div className="loading">Cargando votación…</div>;
  if (!poll) {
    return <><div className="empty-box">Esta votación no existe o ha sido eliminada.</div><p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p></>;
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
  // Si alguien se salió durante el desempate y cambió el empate, todos lo ven ya ajustado al entrar (con su aviso);
  // lo guarda el primer administrador que la abre (TiebreakGuard).
  const view = withTiebreakAdjusted(poll, T);
  const TB = tiebreakTally(view, accepted);
  const requests = Object.entries(votes).filter(([, v]) => v?.status && !v.gone).map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => (a.seenAt || 0) - (b.seenAt || 0));
  const byUid = Object.fromEntries(T.people.map(p => [p.uid, p]));
  // Quien se fue con la votación cerrada deja sus votos (con un nombre sin dueño): cuentan en los totales, pero en
  // «Participantes» va aparte, en «Se fueron».
  const present = T.people.filter(p => !p.gone);
  const gone = T.people.filter(p => p.gone);
  // Quien la creó y se fue sale con su nombre sin dueño; si ha vuelto, con el suyo.
  const founderBack = !!poll.founder && isPresent(shown[poll.founder]);
  const creator = poll.founder
    ? founderBack ? (poll.founder === user.uid ? "ti" : shown[poll.founder].name) : poll.founderName || "alguien"
    : poll.ownerUid === user.uid ? "ti" : poll.ownerName || "alguien";
  // El aviso de que el desempate cambió porque alguien se fue deja de valer cuando un administrador lo cambia.
  const clearTbNote = poll.tbNote ? { tbNote: null } : {};
  const mine = new Set(votes[user.uid]?.picks || []);
  const isOwner = poll.ownerUid === user.uid;
  // Administra (creador o nombrado): gestiona la votación. Eliminarla y nombrar administradores, solo el creador.
  const admin = isAdmin(poll, user.uid);
  const admins = poll.admins || [];
  const expired = deadlinePassed(poll);
  const canVote = !poll.closed && !expired;
  // En el chat se escribe aunque la votación esté cerrada: es cuando se remata el plan.
  const canChat = admin || (!!votes[user.uid] && memberStatus(votes[user.uid]) === "accepted");

  // ---------- Votar ----------

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

  // ---------- Gestión: lo que hacen los administradores (y, lo marcado, solo el creador) ----------

  // Con un desempate finalizado el resultado es definitivo: no se reabre (el menú ni lo ofrece; las reglas tampoco).
  const tbDone = !!poll.tiebreak?.done;
  const final = isFinal(TB);

  const closeOrReopen = () => act(async () => {
    if (poll.closed && tbDone) return;
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
    await store.updatePoll(id, poll.closed
      ? { closed: false, tiebreak: null, ...clearTbNote, ...(expired ? { deadline: 0 } : {}) }
      : { closed: true });
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
    await store.updatePoll(id, { closed: true, tiebreak: { id: Date.now(), candidates: leaders.slice(0, 50).map(e => e.key), done: false, round: 1 }, ...clearTbNote });
    toast("Desempate abierto");
  });

  const tbFinish = () => act(async () => {
    if (!TB) return;
    // Con una sola en cabeza, al finalizar queda como resultado definitivo; si no, solo se podrá repetir.
    const lead = TB.leaders.length === 1 ? unitText(view, T, TB.leaders[0]) : null;
    if (!(await confirm(lead ? {
      title: "¿Finalizar el desempate?",
      message: `Ganará «${lead}» y quedará marcada definitivamente como la opción ganadora: en cuanto lo finalices ya no se podrá votar en el desempate, ni volver a abrirlo, ni reabrir la votación. Se avisará a todos del resultado.`,
      confirmLabel: "Finalizar: es definitivo",
    } : {
      title: "¿Finalizar el desempate sin ganadora?",
      message: `${TB.total ? "Ahora mismo sigue el empate" : "Nadie ha votado todavía en el desempate"}, así que no habrá ganadora. Ya no se podrá votar en esta ronda ni reabrir la votación: solo podrás repetir el desempate.`,
      confirmLabel: "Finalizar sin ganadora",
      danger: true,
    }))) return;
    await store.updatePoll(id, { tiebreak: { ...view.tiebreak!, done: true, finishedAt: Date.now() } });
    toast("Desempate finalizado");
  });

  const tbRepeat = () => act(async () => {
    if (!TB || final) return;
    const cands = repeatCandidates(TB);
    if (!(await confirm({
      title: "¿Repetir el desempate?",
      message: `Nueva ronda solo entre las ${cands.length} opciones ${TB.leaders.length > 1 ? "que siguen empatadas" : "del desempate"}. Cada persona vuelve a elegir una.`,
      confirmLabel: "Repetir desempate",
    }))) return;
    await store.updatePoll(id, { tiebreak: { id: Date.now(), candidates: cands, done: false, round: (poll.tiebreak?.round || 1) + 1 }, ...clearTbNote });
    toast("Nueva ronda de desempate");
  });

  const tbCancel = () => act(async () => {
    if (tbDone) return; // finalizado ya no se quita
    if (!(await confirm({
      title: "¿Anular el desempate?",
      message: "Se borrará el desempate y sus votos. La votación principal seguirá cerrada; puedes reabrirla si quieres.",
      confirmLabel: "Anular",
      danger: true,
    }))) return;
    await store.updatePoll(id, { tiebreak: null, ...clearTbNote });
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

  // El creador nombra o quita administradores (desde «Participantes»).
  const toggleAdmin = (uid: string, name: string) => act(async () => {
    const isAdm = admins.includes(uid);
    if (!(await confirm(isAdm ? {
      title: `¿Quitar a ${name} como administrador?`,
      message: "Seguirá en la votación como participante, pero ya no podrá gestionarla.",
      confirmLabel: "Quitar administrador",
      danger: true,
    } : {
      title: `¿Nombrar a ${name} administrador?`,
      message: "Podrá gestionar la votación como tú: cerrarla y reabrirla, abrir desempates, aceptar solicitudes y cambiar el acceso y el plazo. No podrá eliminarla ni nombrar a otros administradores.",
      confirmLabel: "Nombrar administrador",
    }))) return;
    await store.updatePoll(id, { admins: isAdm ? admins.filter(a => a !== uid) : [...admins, uid] });
    toast(isAdm ? `${name} ya no es administrador` : `${name} ahora es administrador`);
  });

  // Salir de la votación (también el creador: pasa a otra persona). El aviso y la salida, en listActions.
  const leave = () => act(async () => {
    if (await leavePoll(id, { poll, vote: votes[user.uid] ?? null })) navigate("/");
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

  // ---------- Pantalla ----------

  const boardProps: BoardProps = { poll, T, mine, canVote, onVote: toggle };
  const board = {
    days: <BoardDays {...boardProps} />,
    weeks: <BoardWeeks {...boardProps} />,
    months: <BoardMonths {...boardProps} />,
    hours: <BoardHours {...boardProps} />,
    options: <BoardOptions {...boardProps} />,
  }[poll.type];

  return (
    <>
      <div className="poll-head">
        <div className="poll-title">
          <div className="kicker">
            <Icon name={t.icon} /> Votación por {t.name.toLowerCase()} · creada por {creator} · <Icon name="users" /> {plural(present.length, ["participante", "participantes"])}
            {hasLimit(poll) && (isOwner || (poll.maxPeople as number) < MAX_PEOPLE) && <> (máx. {poll.maxPeople})</>}
          </div>
          <div className="mode-line">
            <span className={`mode-pill ${poll.anonymous ? "anon" : ""}`}>{poll.anonymous ? <><Icon name="incognito" /> Anónima</> : <><Icon name="eye" /> Votos visibles</>}</span>
            {poll.emailsOnly && <span className="mode-pill anon"><Icon name="mail" /> Solo invitados</span>}
            {poll.approval && <span className="mode-pill anon"><Icon name="approve" /> Con aprobación</span>}
            {!!poll.deadline && !expired && !poll.closed && <span className="mode-pill"><Icon name="hourglass" /> Se cierra el {fmtDeadline(poll.deadline)}</span>}
          </div>
          <div className="title-row">
            <h1>{poll.title}</h1>
            {admin && (
              <OwnerMenu closed={!!poll.closed} anonymous={!!poll.anonymous}
                onCloseOrReopen={poll.closed && tbDone ? undefined : closeOrReopen}
                onEdit={() => navigate(`/v/${id}/editar`)}
                onAnon={makeAnon} onDelete={isOwner ? remove : undefined}
                onDuplicate={() => duplicate(poll)}
                onAccess={hasLimit(poll) ? () => setAccessOpen(true) : undefined} />
            )}
          </div>
          {poll.description && <p className="desc">{poll.description}</p>}
          <div className="poll-actions">
            <button className="btn primary" onClick={() => share({ url: pollUrl(id), title: poll.title })}>
              <Icon name="link" /> Compartir
            </button>
            {T.top.length > 0 && (
              <button className="btn" onClick={() => act(async () => {
                if (await shareResultCard(poll, T, TB) === "downloaded") toast("Imagen del resultado descargada");
              })}>
                <Icon name="image" /> Compartir resultado
              </button>
            )}
          </div>
        </div>
      </div>
      {admin && accessOpen && <AccessPanel poll={poll} onClose={() => setAccessOpen(false)} />}
      {admin && requests.length > 0 && <Requests poll={poll} requests={requests} onSet={setMember} />}
      {poll.closed && (final ? (
        <div className="closed-banner final">
          <Icon name="trophy" /> Resultado definitivo: <strong>{unitText(view, T, TB!.leaders[0])}</strong>. La votación está cerrada y ya no se puede reabrir.
        </div>
      ) : (
        <div className="closed-banner">
          <Icon name="lock" /> Votación cerrada: ya no se pueden cambiar los votos{TB && !TB.done ? ". Hay un desempate abierto justo debajo" : ""}.
        </div>
      ))}
      {!poll.closed && expired && (
        <div className="closed-banner">
          <Icon name="hourglass" /> Se acabó el plazo el {fmtDeadline(poll.deadline!)}: ya no se pueden cambiar los votos.
          {admin && <> <button className="link-btn" onClick={clearDeadline}>Quitar el plazo</button></>}
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
      <TiebreakSolvedNote poll={view} T={T} />
      {TB && (
        <TiebreakCard poll={view} T={T} TB={TB} myTb={votes[user.uid]?.tb} canManage={admin} byUid={byUid}
          onVote={tiebreakVote} onFinish={tbFinish} onRepeat={tbRepeat} onCancel={tbCancel}
          remind={<RemindMissing poll={poll} T={T} TB={TB} open={canVote} me={user.uid} url={pollUrl(id)} />} />
      )}
      {board}
      <PollTabs tab={tab} setTab={setTab} counts={{ people: present.length }} unread={tab === "chat" ? 0 : chatUnread} />
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
              Hay {T.leaders.length} opciones empatadas en el primer puesto.{admin
                ? " Puedes abrir un desempate en el que cada persona elige solo una."
                : " Quien administra la votación puede abrir un desempate."}
            </p>
            {admin && <button className="btn small" onClick={tbStart}><Icon name="scale" /> Desempatar</button>}
          </div>
        )}
        <div className="summary-list">
          <Summary poll={poll} T={T} TB={TB} openVoters={openVoters} byUid={byUid} onToggle={k => toggleIn(setOpenVoters, k)} />
        </div>
      </section>
      </div>
      <div className="ptab-panel" id="ptab-people" role="tabpanel" aria-labelledby="ptabbtn-people" hidden={tab !== "people"}>
      <section className="results">
        {admin && <div className="summary-head"><RemindMissing poll={poll} T={T} TB={TB} open={canVote} me={user.uid} url={pollUrl(id)} /></div>}
        {!poll.anonymous && T.people.some(p => p.total) && <p className="table-hint">Pulsa en un nombre para ver qué ha votado.</p>}
        <PeopleList people={present} query={peopleQuery} setQuery={setPeopleQuery} filter={peopleFilter} setFilter={setPeopleFilter}
          all={peopleAll} setAll={setPeopleAll}>
          {(people, empty) => (
            <div className="table-wrap">
              <PeopleTable poll={poll} T={T} people={people} empty={empty} me={user.uid} openPeople={openPeople}
                onToggle={k => toggleIn(setOpenPeople, k)} onToggleAdmin={isOwner ? toggleAdmin : undefined} />
            </div>
          )}
        </PeopleList>
        {gone.length > 0 && (
          <GonePeople poll={poll} T={T} people={gone} me={user.uid} openPeople={openPeople} onToggle={k => toggleIn(setOpenPeople, k)} />
        )}
      </section>
      </div>
      <div className="ptab-panel" id="ptab-chat" role="tabpanel" aria-labelledby="ptabbtn-chat" hidden={tab !== "chat"}>
        <Chat poll={poll} id={id} votes={shown} canWrite={canChat} active={tab === "chat"}
          seenAt={chatSeenAt} onUnread={setChatUnread} onSeen={markChatSeen} />
      </div>
      {votes[user.uid] && (
        <div className="poll-leave">
          <button type="button" className="link-btn danger" onClick={leave}>Salir de la votación</button>
        </div>
      )}
      <TiebreakGuard id={id} poll={poll} T={T} active={admin && votesLoaded && !ownOnly} />
    </>
  );
}
