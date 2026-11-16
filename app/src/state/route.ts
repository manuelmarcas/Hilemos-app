// Rutas con #: #/, #/nueva, #/perfil y #/v/<id>. Se mantiene el formato de la web
// original para que los enlaces ya compartidos sigan funcionando.
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
  | { name: "poll"; id: string }
  | { name: "unknown" };

export function parseRoute(path: string): Route {
  if (path === "/") return { name: "home" };
  if (path === "/nueva") return { name: "create" };
  if (path === "/perfil") return { name: "profile" };
  const m = path.match(/^\/v\/([A-Za-z0-9_-]+)$/);
  if (m) return { name: "poll", id: m[1] };
  return { name: "unknown" };
}

export const navigate = (path: string) => { location.hash = `#${path}`; };
