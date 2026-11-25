// Interfaz común a todas las pantallas: avisos (toast), confirmaciones, deshacer, compartir, selector de emojis y
// tooltips (data-tip).
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog, type ConfirmOptions } from "../components/ConfirmDialog";
import { ShareDialog, type ShareTarget } from "../components/ShareDialog";
import { EmojiPanel, type EmojiRequest } from "../components/EmojiPanel";
import { UndoStack, type UndoItem } from "../components/UndoStack";
import { TooltipLayer } from "../components/Tooltip";

interface UiApi {
  toast: (msg: string) => void;
  /** Pregunta con ConfirmDialog; true si se acepta. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Aviso con cuenta atrás y botón "Deshacer" (la acción ya está hecha; `onUndo` la revierte). */
  undoable: (opts: { text: string; onUndo: () => void; seconds?: number; onExpire?: () => void }) => void;
  share: (target: ShareTarget) => void;
  /** Abre el selector junto a `anchor`; si ya estaba abierto ahí, lo cierra. */
  openEmoji: (req: EmojiRequest) => void;
  closeEmoji: () => void;
}

const UiContext = createContext<UiApi | null>(null);

export function useUi() {
  const ui = useContext(UiContext);
  if (!ui) throw new Error("useUi fuera de UiProvider");
  return ui;
}

type Resolve = (ok: boolean) => void;
const MAX_UNDO = 3; // avisos de deshacer a la vez (los más antiguos se descartan)

export function UiProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const [confirmReq, setConfirmReq] = useState<{ opts: ConfirmOptions; resolve: Resolve; n: number } | null>(null);
  const [shareReq, setShareReq] = useState<(ShareTarget & { n: number }) | null>(null);
  const [emojiReq, setEmojiReq] = useState<EmojiRequest | null>(null);
  const [undos, setUndos] = useState<UndoItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastOn(false), 2600);
  }, []);

  const pendingConfirm = useRef<Resolve | null>(null);
  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>(resolve => {
    pendingConfirm.current?.(false); // si había otra abierta, cuenta como «Cancelar»
    pendingConfirm.current = resolve;
    setConfirmReq({ opts, resolve, n: ++seq.current });
  }), []);

  // `onExpire`: lo que se hace cuando ya no se puede deshacer (al acabar la cuenta atrás o si un aviso más nuevo lo
  // desplaza). Así una acción se puede aplazar hasta entonces (salir de una votación) en vez de hacerse y revertirse.
  const expires = useRef(new Map<number, () => void>());
  const undosRef = useRef<UndoItem[]>([]);
  const fireExpire = (id: number) => { const f = expires.current.get(id); expires.current.delete(id); f?.(); };
  const undoable = useCallback(({ text, onUndo, seconds = 5, onExpire }: { text: string; onUndo: () => void; seconds?: number; onExpire?: () => void }) => {
    const item = { id: ++seq.current, text, onUndo, seconds, until: Date.now() + seconds * 1000 };
    if (onExpire) expires.current.set(item.id, onExpire);
    const next = [...undosRef.current, item];
    next.slice(0, -MAX_UNDO).forEach(d => fireExpire(d.id));
    undosRef.current = next.slice(-MAX_UNDO);
    setUndos(undosRef.current);
  }, []);
  const expireUndo = useCallback((id: number) => {
    undosRef.current = undosRef.current.filter(x => x.id !== id);
    setUndos(undosRef.current);
    fireExpire(id);
  }, []);
  const runUndo = useCallback((item: UndoItem) => {
    undosRef.current = undosRef.current.filter(x => x.id !== item.id);
    setUndos(undosRef.current);
    expires.current.delete(item.id);
    item.onUndo();
  }, []);

  const share = useCallback((t: ShareTarget) => setShareReq({ ...t, n: ++seq.current }), []);
  const openEmoji = useCallback((req: EmojiRequest) => {
    setEmojiReq(prev => (prev?.anchor === req.anchor ? null : req)); // segundo clic: cerrar
  }, []);
  const closeEmoji = useCallback(() => setEmojiReq(null), []);

  const api = useMemo(() => ({ toast, confirm, undoable, share, openEmoji, closeEmoji }),
    [toast, confirm, undoable, share, openEmoji, closeEmoji]);

  return (
    <UiContext.Provider value={api}>
      {children}
      {confirmReq && (
        <ConfirmDialog
          key={confirmReq.n}
          opts={confirmReq.opts}
          onAnswer={ok => {
            if (pendingConfirm.current === confirmReq.resolve) pendingConfirm.current = null;
            confirmReq.resolve(ok);
            setConfirmReq(c => (c === confirmReq ? null : c));
          }}
        />
      )}
      {shareReq && <ShareDialog key={shareReq.n} target={shareReq} toast={toast} onClose={() => setShareReq(null)} />}
      {emojiReq && <EmojiPanel req={emojiReq} onClose={closeEmoji} />}
      <UndoStack items={undos} onUndo={runUndo} onExpire={expireUndo} />
      <TooltipLayer />
      <div id="toast" className={`toast${toastOn ? " toast--show" : ""}${undos.length ? " toast--above-undo" : ""}`} role="status" aria-live="polite">{toastMsg}</div>
    </UiContext.Provider>
  );
}
