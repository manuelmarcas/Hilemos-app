// `config/app` (AppConfig en types.ts): lo que se cambia sin publicar otra versión de la app de Android. Se lee una
// vez al arrancar, también sin sesión.
//  - minBuild: si la app de Android es más antigua, hay que actualizarla (por ejemplo, si unas reglas nuevas dejan de
//    aceptar lo que escribe una versión vieja). En la web no aplica: siempre es la última.
//  - notice: un aviso para todos arriba de la página (el de que llega premium, una incidencia…); cada uno se cierra
//    una vez por dispositivo.
import { useCallback, useEffect, useState } from "react";
import { nativeBuild } from "../lib/native";
import type { AppConfig, Store } from "../lib/types";

const DISMISSED = "hilemos-notice-closed";

/** Hay que actualizar: la app de Android (`build`, su versionCode) es anterior a la mínima. */
export const mustUpdate = (build: number | null, minBuild?: number) => build !== null && !!minBuild && build < minBuild;

/** El aviso para todos que toca enseñar (null si no hay o ya se cerró), si hay que actualizar y cómo cerrar el aviso. */
export function useAppConfig(store: Store | null) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [build, setBuild] = useState<number | null>(null);
  const [closed, setClosed] = useState(() => { try { return localStorage.getItem(DISMISSED) || ""; } catch { return ""; } });
  useEffect(() => {
    if (store) void store.getAppConfig().then(setConfig, () => {});
  }, [store]);
  useEffect(() => { void nativeBuild().then(setBuild); }, []);
  const notice = config?.notice?.id && config.notice.text && config.notice.id !== closed ? config.notice : null;
  const closeNotice = useCallback(() => {
    if (!notice) return;
    try { localStorage.setItem(DISMISSED, notice.id); } catch { /* sin almacenamiento: solo hasta recargar */ }
    setClosed(notice.id);
  }, [notice]);
  return { update: mustUpdate(build, config?.minBuild), notice, closeNotice };
}
