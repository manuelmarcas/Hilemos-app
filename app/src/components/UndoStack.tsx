// Avisos con cuenta atrás y botón "Deshacer" (al archivar o eliminar una votación de la lista).
import { useEffect, useState, type CSSProperties } from "react";

export interface UndoItem {
  id: number;
  text: string;
  until: number;   // instante en que deja de poder deshacerse
  seconds: number;
  onUndo: () => void;
}

export function UndoStack({ items, onUndo, onExpire }: {
  items: UndoItem[];
  onUndo: (item: UndoItem) => void;
  onExpire: (id: number) => void;
}) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!items.length) return;
    setNow(Date.now()); // la hora guardada puede ser de mucho antes (cuando no había avisos)
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [items.length]);

  useEffect(() => {
    items.forEach(it => { if (it.until <= now) onExpire(it.id); });
  }, [items, now, onExpire]);

  if (!items.length) return null;
  return (
    <div className="undo-stack" role="status" aria-live="polite">
      {items.map(it => {
        const left = Math.min(it.seconds, Math.max(0, Math.ceil((it.until - now) / 1000)));
        return (
          <div key={it.id} className="undo-bar" style={{ "--undo-ms": `${it.seconds * 1000}ms` } as CSSProperties}>
            <span className="undo-text">{it.text}</span>
            <button type="button" className="undo-btn" onClick={() => onUndo(it)}>
              Deshacer <span className="undo-count" aria-label={`${left} segundos`}>{left}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
