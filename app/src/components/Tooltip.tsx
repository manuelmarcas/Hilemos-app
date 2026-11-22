// Tooltips propios, con el estilo de la app, en vez de los del navegador (`title`, que salen tarde, sin tema y no
// se pueden cambiar). Cualquier elemento con `data-tip="…"` lo muestra al pasar el ratón por encima (con un pequeño
// retraso) o al llegar con el teclado. Hay una sola burbuja para toda la app (la monta UiProvider), con posición fija:
// encima del elemento o, si no cabe, debajo, siempre dentro de la pantalla.
//
// En pantallas táctiles no hay «pasar por encima», así que no salen: lo que explican tiene que entenderse también
// sin ellos (p. ej., al pulsar algo bloqueado sale un aviso). El texto no lo leen los lectores de pantalla: si es el
// único nombre de un elemento, va también en su aria-label.
import { useEffect, useRef, useState, type CSSProperties } from "react";

const DELAY = 350;  // ms hasta que aparece al pasar el ratón
const GAP = 8;      // separación con el elemento
const MARGIN = 8;   // distancia mínima a los bordes de la pantalla

/** `seq`: cambia con cada elemento, para volver a colocarla aunque el texto se repita. */
interface Tip { text: string; seq: number; x: number; y: number; below: boolean; arrow: number }

export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);
  const timer = useRef(0);
  const seq = useRef(0);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      target.current = null;
      setTip(null);
    };
    const show = (el: HTMLElement) => {
      const text = el.dataset.tip;
      if (!text) return;
      target.current = el;
      setTip({ text, seq: ++seq.current, x: -9999, y: -9999, below: false, arrow: 0 }); // se coloca al medirla (useEffect de abajo)
    };
    const tipOf = (n: EventTarget | null) => (n instanceof Element ? n.closest<HTMLElement>("[data-tip]") : null);

    // Con cada movimiento (no solo al entrar): así, tras desplazar la página (que la oculta) vuelve a salir sin
    // tener que sacar el ratón del elemento.
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = tipOf(e.target);
      if (el === target.current) return;
      hide();
      if (el) {
        target.current = el;
        timer.current = window.setTimeout(() => { if (target.current === el) show(el); }, DELAY);
      }
    };
    const focus = (e: FocusEvent) => {
      const el = tipOf(e.target);
      // Solo con el teclado: al pulsar con el ratón el foco también cae, pero ya lo cubre el paso del ratón.
      if (el && el.matches(":focus-visible")) { hide(); show(el); }
    };
    const blur = (e: FocusEvent) => { if (tipOf(e.target) === target.current) hide(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("hashchange", hide);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("hashchange", hide);
    };
  }, []);

  // Colocarla cuando ya se sabe su tamaño: centrada sobre el elemento, dentro de la pantalla.
  const text = tip?.text;
  const n = tip?.seq;
  useEffect(() => {
    const el = target.current, b = bubble.current;
    if (!text || !el || !b || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const w = b.offsetWidth, h = b.offsetHeight;
    const below = r.top - GAP - h < MARGIN;
    const center = r.left + r.width / 2;
    const x = Math.min(Math.max(center - w / 2, MARGIN), window.innerWidth - w - MARGIN);
    const y = below ? r.bottom + GAP : r.top - GAP - h;
    setTip(t => (t && t.seq === n ? { ...t, x, y, below, arrow: Math.min(Math.max(center - x, 12), w - 12) } : t));
  }, [text, n]);

  if (!tip) return null;
  return (
    <div ref={bubble} className={`tooltip${tip.below ? " tooltip--below" : ""}${tip.x < -999 ? "" : " tooltip--on"}`} aria-hidden="true"
      style={{ left: tip.x, top: tip.y, "--tip-arrow": `${tip.arrow}px` } as CSSProperties}>
      {tip.text}
    </div>
  );
}
