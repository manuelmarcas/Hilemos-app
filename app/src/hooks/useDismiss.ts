// Desplegables y menús que se cierran solos: al pulsar fuera o con Escape (volviendo el foco al botón que los abre).
import { useEffect, useRef, type RefObject } from "react";

/**
 * Mientras `open`, cierra con `setOpen(false)` al pulsar fuera de `wrap` o al pulsar Escape (y devuelve el foco a
 * `btn`). `onKey` recibe las demás teclas (p. ej. las flechas de un menú).
 */
export function useDismiss(open: boolean, setOpen: (open: boolean) => void,
  wrap: RefObject<HTMLElement | null>, btn: RefObject<HTMLElement | null>, onKey?: (e: KeyboardEvent) => void) {
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); return; }
      keyRef.current?.(e);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [open, setOpen, wrap, btn]);
}

/** Menú (role="menu"): como useDismiss, y además al abrirse enfoca la primera opción y se recorre con las flechas. */
export function useMenuKeys(open: boolean, setOpen: (open: boolean) => void,
  wrap: RefObject<HTMLElement | null>, btn: RefObject<HTMLElement | null>) {
  const items = () => [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [])];
  useEffect(() => { if (open) items()[0]?.focus(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useDismiss(open, setOpen, wrap, btn, e => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
  });
}
