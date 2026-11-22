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
  undoable: (opts: { text: string; onUndo: () => void; seconds?: number }) => void;
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

  const undoable = useCallback(({ text, onUndo, seconds = 5 }: { text: string; onUndo: () => void; seconds?: number }) => {
    const item = { id: ++seq.current, text, onUndo, seconds, until: Date.now() + seconds * 1000 };
    setUndos(list => [...list, item].slice(-MAX_UNDO));
  }, []);
  const expireUndo = useCallback((id: number) => setUndos(list => list.filter(x => x.id !== id)), []);
  const runUndo = useCallback((item: UndoItem) => {
    setUndos(list => list.filter(x => x.id !== item.id));
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
      <div id="toast" className={`toast${toastOn ? " show" : ""}${undos.length ? " above-undo" : ""}`} role="status" aria-live="polite">{toastMsg}</div>
    </UiContext.Provider>
  );
}
