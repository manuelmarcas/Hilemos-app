// Marca de las funciones que serán de pago (docs/funcionalidades-y-planes.md, §3 y docs/plan-hasta-premium.md):
// de momento funcionan para todos, pero se ven marcadas para que nadie se sienta engañado cuando empiece el cobro.
// - PremiumTag: la etiqueta «Premium» con la estrella, junto al nombre de la función.
// - PremiumNote: una línea que explica la etiqueta (en el móvil no hay tooltip); una por pantalla.
import { cls } from "../lib/util";
import { Icon } from "./Icon";

const TIP = "Función premium: gratis durante el lanzamiento";

/**
 * Etiqueta «Premium». `decorative`: dentro de un botón o de un elemento de menú, que ya tienen su nombre (no se lo
 * cambia a los lectores de pantalla); el tooltip sigue saliendo con el ratón.
 */
export function PremiumTag({ decorative, className }: { decorative?: boolean; className?: string }) {
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": TIP };
  return (
    <span className={cls("premium-tag", className)} data-tip={TIP} {...a11y}>
      <Icon name="premium" /><span aria-hidden="true">Premium</span>
    </span>
  );
}

/** Explica la etiqueta: lo marcado será de pago, pero ahora es gratis. */
export function PremiumNote({ className }: { className?: string }) {
  return (
    <p className={cls("premium-note", className)}>
      <PremiumTag decorative /> Lo marcado así será de pago más adelante. Durante el lanzamiento, gratis para todos.
    </p>
  );
}
