// Acciones sobre la lista del usuario, compartidas por «Mis votaciones», el menú lateral y la propia votación:
// archivar/desarchivar (al momento, con un aviso de «Deshacer» con cuenta atrás: así no se pierde nada si se cierra
// la app), salir de una votación (siempre con confirmación: no se puede deshacer), mover una votación de grupo y
// eliminar un grupo.
import { useCallback } from "react";
import { MAX_PEOPLE, hasLimit, isAdmin, keepsVotesOnLeave, memberStatus } from "../lib/model";
import type { Library, Poll, Vote } from "../lib/types";
import { errMsg } from "../lib/util";
import { useSession } from "./session";
import { useUi } from "./ui";

/**
 * Grupo que se queda vacío si la votación `pollId` sale de la lista (o null).
 * Las archivadas cuentan: un grupo con votaciones archivadas no se borra.
 */
export function groupToDrop(lib: Library | null, pollId: string) {
  const gid = lib?.polls[pollId]?.groupId;
  if (!lib || !gid || !lib.groups[gid]) return null;
  const others = Object.entries(lib.polls).some(([id, e]) => id !== pollId && e.groupId === gid);
  return others ? null : gid;
}

const short = (t: string | undefined) => {
  const s = t || "Votación";
  return s.length > 28 ? s.slice(0, 27) + "…" : s;
};

/**
 * Qué pasa al salir de la votación `p`, según cómo esté y qué papel tenga `uid` en ella (lo que hace `leavePoll`
 * en los almacenes). `vote`: su voto (null si no participa). `group`: grupo que se queda vacío y se elimina.
 */
function leaveMessage(p: Poll, uid: string, vote: Vote | null, group: string | null) {
  const status = vote ? memberStatus(vote) : null;
  const keeps = status === "accepted" && keepsVotesOnLeave(p);
  const out: string[] = [];
  if (status === "pending") {
    out.push("Se retirará tu solicitud para entrar.");
  } else if (status === "accepted") {
    if (keeps) {
      out.push("Ya no se puede votar, así que tus votos se quedan, pero con un nombre sin dueño.");
    } else if (p.tiebreak && !p.tiebreak.done) {
      out.push("Hay un desempate abierto, así que se borrarán tus votos (también el del desempate). Si con eso cambia " +
        "el empate, el desempate se ajusta: sigue entre las que queden empatadas o, si ya no hay empate, gana la más votada.");
    } else {
      // La plaza solo importa si quien la creó puso un máximo (sin él, el tope es el general, MAX_PEOPLE).
      const limited = hasLimit(p) && (p.maxPeople as number) < MAX_PEOPLE;
      out.push(limited ? "Se borrarán tus votos y tu plaza quedará libre." : "Se borrarán tus votos.");
    }
    out.push("Si escribiste en el chat, tus mensajes se quedan, también con un nombre sin dueño.");
  }
  if (p.ownerUid === uid) {
    out.push("Como la creaste, pasará a un administrador o a otro participante al azar (si no queda nadie, se " +
      "borrará). Si vuelves, entrarás como participante.");
  } else if (isAdmin(p, uid)) {
    out.push("Dejarás de ser administrador.");
  }
  if (group) out.push(`Era la última votación del grupo «${group}», así que el grupo también se eliminará.`);
  // Cómo volver. Con los votos que se quedan, su voto sigue ahí y al volver recupera su nombre (joinPoll); si no,
  // entra de nuevo (con aprobación, pidiéndolo otra vez). Sus mensajes del chat recuperan su nombre al volver a estar.
  if (status === "rejected") out.push("Solo se quitará de tu lista: no puedes volver a entrar.");
  else if (keeps) out.push("Si vuelves a entrar con el enlace, recuperarás tu nombre y tus votos.");
  else if (p.approval) out.push("Para volver, tendrás que pedir entrar otra vez con el enlace.");
  else out.push(status === "accepted"
    ? "Podrás volver a entrar con el enlace, y tus mensajes recuperarán tu nombre."
    : "Podrás volver a entrar con el enlace.");
  return out.join(" ");
}

export function useListActions() {
  const { store, user, library } = useSession();
  const { toast, confirm, undoable } = useUi();
  const lib = library.data;

  /** Archiva (o desarchiva) una votación. Devuelve false si no se pudo. */
  const setArchived = useCallback(async (id: string, archived: boolean) => {
    const entry = lib?.polls[id];
    if (!entry) return false;
    try {
      await store.saveLibraryEntry(user.uid, id, { archived });
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
    undoable({
      text: archived ? `«${short(entry.title)}» archivada` : `«${short(entry.title)}» vuelve a tus votaciones`,
      onUndo: () => { store.saveLibraryEntry(user.uid, id, { archived: !archived }).catch(e => toast(errMsg(e))); },
    });
    return true;
  }, [lib, store, user.uid, toast, undoable]);

  /**
   * Sale de la votación `id` tras confirmarlo, con un aviso de lo que pasará (leaveMessage). Si la votación ya no
   * existe, solo la quita de la lista. `known`: la votación y el voto propio, si ya se tienen (desde la propia
   * votación), para no volver a pedirlos. Devuelve true si salió.
   */
  const leave = useCallback(async (id: string, known?: { poll: Poll; vote: Vote | null }) => {
    const gid = groupToDrop(lib, id);
    const group = gid ? lib?.groups[gid]?.name || "" : null;
    const title = known?.poll.title || lib?.polls[id]?.title;
    try {
      const poll = known ? known.poll : await store.getPoll(id);
      if (!poll) {
        if (!(await confirm({
          title: "¿Quitar de tu lista?",
          message: "Esta votación ya no existe: la eliminó quien la creó. Solo se quitará de tu lista." +
            (group ? ` Era la última del grupo «${group}», así que el grupo también se eliminará.` : ""),
          confirmLabel: "Quitar",
          danger: true,
        }))) return false;
        await store.removeLibraryEntry(user.uid, id, gid);
        toast(`«${short(title)}» quitada de tu lista`);
        return true;
      }
      const vote = known ? known.vote : await store.getVote(id, user.uid);
      if (!(await confirm({
        title: "¿Salir de la votación?",
        message: leaveMessage(poll, user.uid, vote, group),
        confirmLabel: "Salir",
        danger: true,
      }))) return false;
      await store.leavePoll(id, user.uid, gid);
      toast(`Has salido de «${short(poll.title || title)}»`);
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
  }, [lib, store, user.uid, confirm, toast]);

  /** Mueve una votación a un grupo (null o "" = «Sin grupo»). `groupName`: si el grupo se acaba de crear. */
  const moveTo = useCallback(async (id: string, gid: string | null, groupName?: string) => {
    await store.saveLibraryEntry(user.uid, id, { groupId: gid || null });
    toast(gid ? `Movida a «${groupName || lib?.groups[gid]?.name || "grupo"}»` : "Movida a «Sin grupo»");
  }, [lib, store, user.uid, toast]);

  /** Elimina un grupo, tras confirmarlo (sus votaciones pasan a «Sin grupo»). Devuelve false si se canceló. */
  const deleteGroup = useCallback(async (gid: string) => {
    const g = lib?.groups[gid];
    if (!g || !(await confirm({
      title: `¿Eliminar el grupo «${g.name}»?`,
      message: "Las votaciones del grupo no se borran: pasan a «Sin grupo».",
      confirmLabel: "Eliminar grupo",
      danger: true,
    }))) return false;
    await store.deleteGroup(user.uid, gid);
    toast("Grupo eliminado");
    return true;
  }, [lib, store, user.uid, confirm, toast]);

  return { setArchived, leave, moveTo, deleteGroup };
}
