// Cuántas votaciones abiertas gestiona quien usa la app (las que creó o heredó), para marcar como premium pasar de
// FREE_OPEN a la vez (3.1, §9): al crear una votación y al reabrir. Lee las de su lista con papel de creador, de la
// caché de votaciones (la llenan el inicio y cada votación abierta) o, si faltan, de una en una.
import { useEffect, useState } from "react";
import { openManaged } from "../lib/model";
import { useSession } from "./session";

/** Votaciones abiertas que gestiona; null mientras se cuentan. */
export function useOpenManaged(): number | null {
  const { store, user, library, pollCache } = useSession();
  const owned = Object.entries(library.data?.polls || {}).filter(([, e]) => e.role === "owner").map(([id]) => id);
  const key = owned.join(",");
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(key.split(",").filter(Boolean).map(id => pollCache.has(id)
      ? pollCache.get(id)
      : store.getPoll(id).then(p => { pollCache.set(id, p); return p; }).catch(() => null)))
      .then(polls => { if (alive) setCount(openManaged(polls, user.uid)); });
    return () => { alive = false; };
  }, [key, store, user.uid, pollCache]);
  return count;
}
