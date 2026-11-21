// Clave de acceso recién creada para una cuenta sin registro: la crea la entrada (Gate) o «Tu perfil» y la
// enseña el diálogo AccessKeyDialog (montado en Shell, que sigue ahí aunque la sesión cambie de pantalla).
// Se guarda en sessionStorage hasta que se confirma, para que una recarga no la pierda antes de copiarla.
import { useSyncExternalStore } from "react";
import type { Store } from "../lib/types";
import { errMsg } from "../lib/util";

export type NewKey =
  | { status: "creating" }
  | { status: "ready"; key: string }
  | { status: "error"; error: string }
  | null;

const SKEY = "hilemos-new-key";
let state: NewKey = null;
try {
  const k = sessionStorage.getItem(SKEY);
  if (k) state = { status: "ready", key: k };
} catch { /* sin sessionStorage */ }
const subs = new Set<() => void>();

function set(s: NewKey) {
  state = s;
  try {
    if (s?.status === "ready") sessionStorage.setItem(SKEY, s.key);
    else if (!s) sessionStorage.removeItem(SKEY);
  } catch { /* nada */ }
  subs.forEach(f => f());
}

export function useNewKey(): NewKey {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => state);
}

/** Pide al servidor una clave nueva (la anterior deja de valer) y la deja lista para enseñarla. */
export async function makeAccessKey(store: Store) {
  set({ status: "creating" });
  try { set({ status: "ready", key: await store.createAccessKey() }); }
  catch (e) { set({ status: "error", error: errMsg(e) }); }
}

/** La persona confirma que la ha guardado (o cierra el aviso de error). */
export function dismissAccessKey() { set(null); }
