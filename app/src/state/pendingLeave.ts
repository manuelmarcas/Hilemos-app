// Votaciones de las que se está saliendo: tras confirmarlo hay unos segundos para «Deshacer» antes de salir de verdad
// (listActions.leave). Mientras, ya no se ven en «Mis votaciones» ni en el menú lateral, como si ya se hubiera salido.
import { useSyncExternalStore } from "react";

let pending: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

export function hidePoll(id: string) { pending = new Set([...pending, id]); emit(); }
export function showPoll(id: string) {
  if (!pending.has(id)) return;
  const next = new Set(pending);
  next.delete(id);
  pending = next;
  emit();
}

/** Ids de las votaciones de las que se está saliendo (para no enseñarlas). */
export function usePendingLeaves() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => pending);
}
