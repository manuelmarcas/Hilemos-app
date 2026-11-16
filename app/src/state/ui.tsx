// Interfaz común a todas las pantallas: avisos (toast), confirmaciones, compartir y selector de emojis.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog, type ConfirmOptions } from "../components/ConfirmDialog";
import { ShareDialog, type ShareTarget } from "../components/ShareDialog";
import { EmojiPanel, type EmojiRequest } from "../components/EmojiPanel";

interface UiApi {
  toast: (msg: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
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

export function UiProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const [confirmReq, setConfirmReq] = useState<{ opts: ConfirmOptions; resolve: (b: boolean) => void; n: number } | null>(null);
  const [shareReq, setShareReq] = useState<(ShareTarget & { n: number }) | null>(null);
  const [emojiReq, setEmojiReq] = useState<EmojiRequest | null>(null);
  const seq = useRef(0);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastOn(false), 2600);
  }, []);

  const pendingConfirm = useRef<((b: boolean) => void) | null>(null);
  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>(resolve => {
    pendingConfirm.current?.(false); // si había otra abierta, cuenta como "Cancelar"
    pendingConfirm.current = resolve;
    setConfirmReq({ opts, resolve, n: ++seq.current });
  }), []);

  const share = useCallback((t: ShareTarget) => setShareReq({ ...t, n: ++seq.current }), []);
  const openEmoji = useCallback((req: EmojiRequest) => {
    setEmojiReq(prev => (prev?.anchor === req.anchor ? null : req)); // segundo clic: cerrar
  }, []);
  const closeEmoji = useCallback(() => setEmojiReq(null), []);

  const api = useMemo(() => ({ toast, confirm, share, openEmoji, closeEmoji }), [toast, confirm, share, openEmoji, closeEmoji]);

  return (
    <UiContext.Provider value={api}>
      {children}
      {confirmReq && (
        <ConfirmDialog
          key={confirmReq.n}
          opts={confirmReq.opts}
          onAnswer={yes => {
            if (pendingConfirm.current === confirmReq.resolve) pendingConfirm.current = null;
            confirmReq.resolve(yes);
            setConfirmReq(c => (c === confirmReq ? null : c));
          }}
        />
      )}
      {shareReq && <ShareDialog key={shareReq.n} target={shareReq} toast={toast} onClose={() => setShareReq(null)} />}
      {emojiReq && <EmojiPanel req={emojiReq} onClose={closeEmoji} />}
      <div id="toast" className={`toast${toastOn ? " show" : ""}`} role="status" aria-live="polite">{toastMsg}</div>
    </UiContext.Provider>
  );
}
