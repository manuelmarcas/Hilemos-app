// Rutas con #: #/, #/nueva, #/perfil, #/v/<id>, #/v/<id>/chat (abre la pestaña del chat: los avisos del chat llevan
// ahí), #/v/<id>/editar, #/privacidad y #/condiciones. Se mantiene el
// formato de la web original para que los enlaces ya compartidos sigan funcionando.
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getPath = () => location.hash.replace(/^#/, "") || "/";

export const useHashPath = () => useSyncExternalStore(subscribe, getPath);

export type Route =
  | { name: "home" }
  | { name: "create" }
  | { name: "profile" }
  | { name: "poll"; id: string; chat?: boolean }
  | { name: "edit"; id: string }
  | { name: "legal"; doc: LegalDoc }
  | { name: "unknown" };

/** Páginas legales: se ven también sin sesión (enlazadas desde la entrada). */
export type LegalDoc = "privacidad" | "condiciones";
/** La ruta es una página legal (App la muestra sin pedir sesión). */
export const legalDoc = (path: string): LegalDoc | null =>
  path === "/privacidad" ? "privacidad" : path === "/condiciones" ? "condiciones" : null;

export function parseRoute(path: string): Route {
  if (path === "/") return { name: "home" };
  if (path === "/nueva") return { name: "create" };
  if (path === "/perfil") return { name: "profile" };
  const doc = legalDoc(path);
  if (doc) return { name: "legal", doc };
  const m = path.match(/^\/v\/([A-Za-z0-9_-]+)(\/editar|\/chat)?$/);
  if (m) return m[2] === "/editar" ? { name: "edit", id: m[1] } : { name: "poll", id: m[1], ...(m[2] ? { chat: true } : {}) };
  return { name: "unknown" };
}

export const navigate = (path: string) => { location.hash = `#${path}`; };
