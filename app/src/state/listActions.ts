// Acciones sobre la lista del usuario: archivar/desarchivar y eliminar de la lista (con "Deshacer").
// Se aplican al momento y el aviso con cuenta atrás permite revertirlas: así no se pierden si se cierra la app.
import { useCallback } from "react";
import type { Library } from "../lib/types";
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

export function useListActions() {
  const { store, user, library, updateUser } = useSession();
  const { toast, confirmWithCheck, undoable } = useUi();
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

  /** Quita una votación de la lista (con el aviso la primera vez). Devuelve false si se canceló o falló. */
  const remove = useCallback(async (id: string) => {
    const entry = lib?.polls[id];
    if (!lib || !entry) return false;
    if (!user.hideRemoveWarning) {
      const r = await confirmWithCheck({
        title: "¿Eliminar de tu lista?",
        message: "La votación dejará de aparecer en tus votaciones y en el menú. No se borra para los demás y tus votos " +
          "se mantienen: podrás volver a unirte con su enlace. Si es la última votación de un grupo, el grupo también " +
          "se elimina. (Para borrar para todos una votación que creaste, usa «Eliminar votación» dentro de ella).",
        confirmLabel: "Eliminar de mi lista",
        danger: true,
        checkbox: "No volver a mostrar este aviso",
      });
      if (r.checked) {
        updateUser({ hideRemoveWarning: true });
        store.saveProfile(user.uid, { hideRemoveWarning: true }).catch(() => {});
      }
      if (!r.ok) return false;
    }
    const gid = groupToDrop(lib, id);
    const group = gid ? lib.groups[gid] : null;
    try {
      await store.removeLibraryEntry(user.uid, id, gid);
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
    undoable({
      text: `«${short(entry.title)}» eliminada de tu lista${group ? ` (y el grupo «${group.name}»)` : ""}`,
      onUndo: async () => {
        try {
          if (gid && group) await store.restoreGroup(user.uid, gid, group);
          await store.saveLibraryEntry(user.uid, id, entry);
        } catch (e) { toast(errMsg(e)); }
      },
    });
    return true;
  }, [lib, store, user.uid, user.hideRemoveWarning, updateUser, confirmWithCheck, toast, undoable]);

  return { setArchived, remove };
}
