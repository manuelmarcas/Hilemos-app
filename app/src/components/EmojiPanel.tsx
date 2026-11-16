// Selector de emojis completo (todos los de Unicode, como WhatsApp): categorías, búsqueda en
// español, tonos de piel y "usados recientemente". Usa emoji-picker-element (Apache-2.0), que se
// carga la primera vez que se abre. Los datos van incluidos en la app (funciona sin conexión).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dataUrl from "emoji-picker-element-data/es/cldr/data.json?url";
import { isDark } from "../lib/theme";

export interface EmojiRequest {
  anchor: HTMLElement;
  onPick: (emoji: string) => void;
  keepOpen?: boolean; // no cerrar al elegir (para escribir varios seguidos en un texto)
}

let loading: Promise<{ Picker: typeof import("emoji-picker-element").Picker; i18n: import("emoji-picker-element/shared").I18n }> | null = null;
function loadLib() {
  loading ||= Promise.all([import("emoji-picker-element"), import("emoji-picker-element/i18n/es.js")])
    .then(([lib, es]) => ({ Picker: lib.Picker, i18n: es.default }))
    .catch(e => { loading = null; throw e; });
  return loading;
}

const isNarrow = () => window.matchMedia("(max-width: 599.98px)").matches;

export function EmojiPanel({ req, onClose }: { req: EmojiRequest; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [sheet, setSheet] = useState(isNarrow);
  const close = useRef(onClose);
  close.current = onClose;

  const position = useCallback(() => {
    const p = panel.current;
    if (!p) return;
    if (isNarrow()) { // hoja inferior en móvil
      setSheet(true);
      p.style.left = p.style.top = "";
      return;
    }
    setSheet(false);
    const r = req.anchor.getBoundingClientRect();
    const w = p.offsetWidth, h = p.offsetHeight;
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6; // mejor encima
    p.style.left = `${left + window.scrollX}px`;
    p.style.top = `${Math.max(8, top) + window.scrollY}px`;
  }, [req.anchor]);

  useLayoutEffect(position, [position, state]);

  useEffect(() => {
    const { anchor } = req;
    anchor.setAttribute("aria-expanded", "true");
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.contains(t)) return;
      close.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close.current();
      anchor.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", position);
    return () => {
      anchor.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", position);
    };
  }, [req, position]);

  useEffect(() => {
    let alive = true;
    loadLib().then(({ Picker, i18n }) => {
      if (!alive || !body.current) return;
      const picker = new Picker({ locale: "es", dataSource: dataUrl, i18n });
      picker.classList.add(isDark() ? "dark" : "light");
      picker.addEventListener("emoji-click", e => {
        if (!req.keepOpen) close.current();
        if (e.detail.unicode) req.onPick(e.detail.unicode);
      });
      body.current.replaceChildren(picker);
      setState("ready");
    }).catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [req]);

  return createPortal(
    <div ref={panel} className={`emoji-panel${sheet ? " sheet" : ""}`} role="dialog" aria-label="Elegir emoji">
      <div className="emoji-panel-head">
        <span>Elige un emoji</span>
        <button type="button" className="emoji-panel-x" aria-label="Cerrar" onClick={() => close.current()}>×</button>
      </div>
      <div className="emoji-panel-body">
        {/* React no pinta nada dentro de este contenedor: ahí se mete el <emoji-picker>. */}
        <div ref={body} style={{ display: "contents" }} />
        {state === "loading" && <div className="emoji-panel-msg">Cargando emojis…</div>}
        {state === "error" && (
          <div className="emoji-panel-msg">No se pudieron cargar los emojis. Comprueba tu conexión o usa el teclado de emojis del dispositivo.</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
