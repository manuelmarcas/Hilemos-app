// Lo que manda `config/app` (state/appConfig.ts): el aviso para todos, arriba de la página, y la pantalla que pide
// actualizar la app de Android cuando es demasiado antigua.
import { LogoMark } from "./LogoMark";
import { PLAY_URL } from "../lib/native";
import type { AppConfig } from "../lib/types";

/** Aviso para todos: su texto, un enlace si lo trae y «Entendido» para no volver a verlo en este dispositivo. */
export function NoticeBanner({ notice, onClose }: { notice: NonNullable<AppConfig["notice"]>; onClose: () => void }) {
  const external = !!notice.url && /^https?:/.test(notice.url);
  return (
    <div className="notice-banner" role="status">
      <span className="notice-banner__text">{notice.text}</span>
      {notice.url && (
        <a className="notice-banner__link" href={notice.url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          Más información
        </a>
      )}
      <button type="button" className="link-btn notice-banner__close" onClick={onClose}>Entendido</button>
    </div>
  );
}

/** La app de Android es más antigua que la mínima: hay que actualizarla para seguir (no se puede usar la vieja). */
export function UpdateRequired() {
  return (
    <div className="boot">
      <LogoMark className="boot__logo" size={96} />
      <div className="empty-box">Hay una versión nueva de Hilemos y esta ya no funciona. Actualízala para seguir.</div>
      <a className="btn btn--primary" href={PLAY_URL} target="_blank" rel="noopener noreferrer">Actualizar en Google Play</a>
    </div>
  );
}
