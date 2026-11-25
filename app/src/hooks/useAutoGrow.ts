// Campos de texto de varias líneas (textarea) que crecen solos con lo escrito, en vez de tener un tirador para
// agrandarlos a mano: empiezan con su altura (rows) y, si el texto no cabe, crecen hasta `max` px; a partir de ahí, se
// desplaza dentro. Va con la clase .input--area (sin tirador).
import { useLayoutEffect, type RefObject } from "react";

/**
 * Ajusta la altura de `ref` a su texto cada vez que cambia `value`. Oculto (display:none, como la pestaña del chat
 * cuando no está abierta) no se puede medir: `active` dice cuándo se ve, para medirlo al mostrarlo.
 */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string, max: number, active = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    el.style.height = "auto";
    // +2: el borde, que scrollHeight no cuenta (con box-sizing:border-box se cortaría la última línea).
    el.style.height = `${Math.min(el.scrollHeight + 2, max)}px`;
  }, [ref, value, max, active]);
}
