// Marca de las funciones que serán de pago (docs/funcionalidades-y-planes.md, §3, §8 y §9; textos en lib/premium.ts).
// De momento funcionan para todos, pero se ven marcadas para que nadie se sienta engañado cuando empiece el cobro.
// - PremiumTag: la etiqueta «Premium» con la estrella. Al tocarla se abre la explicación de esa función: qué hace,
//   por qué será premium y que ahora es gratis.
// - PremiumNote: una línea que explica la etiqueta (una por pantalla); su etiqueta abre todas las funciones.
// - PremiumHost: la ventana de la explicación, una sola para toda la app (en Shell). Va aparte de la etiqueta porque
//   la etiqueta puede estar en un menú que se cierra al pulsar fuera, y se llevaría la ventana con él.
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ALWAYS_FREE, LAUNCH_FREE, PREMIUM_INFO, type PremiumFeature } from "../lib/premium";
import { cls } from "../lib/util";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

const TIP = "Premium: gratis durante el lanzamiento. Pulsa para saber más";
const EVENT = "hilemos-premium";

/** Abre la explicación de `feature` (o de todas, con "all"). */
const openPremium = (feature: PremiumFeature | "all") => window.dispatchEvent(new CustomEvent(EVENT, { detail: feature }));

/**
 * Etiqueta «Premium». Fuera de un botón es un botón. Dentro de uno (`nested`: tarjeta, «Hacer admin», un elemento
 * de menú) es una etiqueta que, al pulsarla, abre la explicación en vez de hacer lo del botón; no cambia el nombre
 * del botón para los lectores de pantalla (para ellos está PremiumNote). Sin `feature`, explica todas.
 */
export function PremiumTag({ feature, nested, className }: { feature?: PremiumFeature; nested?: boolean; className?: string }) {
  const show = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); openPremium(feature || "all"); };
  const body = <><Icon name="premium" /><span aria-hidden="true">Premium</span></>;
  return nested
    ? <span className={cls("premium-tag", className)} data-tip={TIP} aria-hidden="true" onClick={show}>{body}</span>
    : (
      <button type="button" className={cls("premium-tag", className)} data-tip={TIP}
        aria-label={feature ? `Premium: ${PREMIUM_INFO[feature].title}. Saber más` : "Qué es premium"} onClick={show}>
        {body}
      </button>
    );
}

/** Explica la etiqueta: lo marcado será de pago, pero ahora es gratis. Su etiqueta abre todas las funciones. */
export function PremiumNote({ className }: { className?: string }) {
  return (
    <p className={cls("premium-note", className)}>
      <PremiumTag /> Lo marcado así será de pago más adelante. Durante el lanzamiento, gratis para todos. Pulsa la
      etiqueta para saber por qué.
    </p>
  );
}

/** La ventana de la explicación (una para toda la app): qué hace, por qué será premium y que ahora es gratis. */
export function PremiumHost() {
  const [feature, setFeature] = useState<PremiumFeature | "all" | null>(null);
  const dlg = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const on = (e: Event) => setFeature((e as CustomEvent<PremiumFeature | "all">).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  if (!feature) return null;
  const info = feature === "all" ? null : PREMIUM_INFO[feature];
  return (
    <Dialog key={feature} className="dialog premium-dialog" onClose={() => setFeature(null)} onOpen={d => { dlg.current = d; }}>
      <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
      <p className="premium-dialog__kicker"><Icon name="premium" /> Premium</p>
      <h2 className="dialog__title">{info ? info.title : "Funciones premium"}</h2>
      {info ? <>
        <p className="premium-dialog__text">{info.what}</p>
        <h3 className="premium-dialog__label">Por qué será premium</h3>
        <p className="premium-dialog__text">{info.why}</p>
      </> : (
        <ul className="premium-dialog__list">
          {Object.values(PREMIUM_INFO).map(i => <li key={i.title}><strong>{i.title}.</strong> {i.what}</li>)}
        </ul>
      )}
      <p className="premium-dialog__free"><strong>Ahora, gratis.</strong> {LAUNCH_FREE}</p>
      <p className="premium-dialog__text premium-dialog__text--muted">{ALWAYS_FREE}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary dialog__btn" onClick={() => dlg.current?.close()}>Entendido</button>
      </div>
    </Dialog>
  );
}
