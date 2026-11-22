// Fila que se desliza con el dedo (móvil): hacia la derecha o la izquierda lanza una acción.
// Con ratón no hace nada (en el ordenador las mismas acciones están en el botón ⋯).
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { bem, cls } from "../lib/util";

export interface SwipeAction {
  icon: ReactNode;
  label: string;
  tone: "archive" | "danger";
  /** Devuelve false si no se hizo (cancelada o error): la fila vuelve a su sitio. */
  run: () => Promise<boolean> | boolean;
}

const START = 10;    // px que hay que mover antes de decidir si es deslizar o hacer scroll
const TRIGGER = 0.35; // fracción del ancho a partir de la cual se lanza la acción al soltar
const MAX_TRIGGER = 140;

export function SwipeRow({ right, left, children }: {
  right: SwipeAction; // al deslizar hacia la derecha (→)
  left: SwipeAction;  // al deslizar hacia la izquierda (←)
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; mode: "?" | "swipe" | "scroll" } | null>(null);
  const swiped = useRef(false); // para no abrir la votación al soltar después de deslizar
  const busy = useRef(false);

  const threshold = () => Math.min(MAX_TRIGGER, (box.current?.offsetWidth || 300) * TRIGGER);

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || busy.current) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, mode: "?" };
    swiped.current = false;
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    if (d.mode === "?") {
      if (Math.abs(mx) > START && Math.abs(mx) > Math.abs(my) * 1.2) {
        d.mode = "swipe";
        swiped.current = true;
        setAnimating(false);
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* nada */ }
      } else if (Math.abs(my) > START) {
        d.mode = "scroll";
      }
    }
    if (d.mode === "swipe") setDx(mx);
  };

  const onUp = async (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.mode !== "swipe") return;
    setAnimating(true);
    const action = dx > 0 ? right : left;
    if (Math.abs(dx) < threshold()) { setDx(0); return; }
    // Se va del todo hacia el lado y se lanza la acción; si no se hace, vuelve.
    const width = box.current?.offsetWidth || 400;
    setDx(dx > 0 ? width : -width);
    busy.current = true;
    let ok = false;
    try { ok = await action.run(); } catch { ok = false; }
    busy.current = false;
    if (!ok) setDx(0);
  };

  const armed = Math.abs(dx) >= threshold();
  const progress = Math.min(1, Math.abs(dx) / threshold());
  const showing = dx > 0 ? right : dx < 0 ? left : null;

  return (
    <div ref={box} className={cls("swipe", dx !== 0 && "swipe--swiping")}>
      {showing && (
        <div className={bem("swipe__bg", { [showing.tone]: true, "from-left": dx > 0, "from-right": dx <= 0, armed })}
          style={{ "--p": progress.toFixed(3) } as CSSProperties} aria-hidden="true">
          <span className="swipe__icon">{showing.icon}</span>
          <span className="swipe__label">{showing.label}</span>
        </div>
      )}
      <div
        className="swipe__fg"
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: animating ? "transform .22s ease" : "none" }}
        onTransitionEnd={() => setAnimating(false)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={e => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}
      >
        {children}
      </div>
    </div>
  );
}
