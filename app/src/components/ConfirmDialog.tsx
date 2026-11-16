import { useRef } from "react";
import { Dialog } from "./Dialog";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

// Ventana de confirmación propia (en vez de window.confirm).
export function ConfirmDialog({ opts, onAnswer }: { opts: ConfirmOptions; onAnswer: (yes: boolean) => void }) {
  const answer = useRef(false);
  const ref = useRef<HTMLDialogElement | null>(null);
  const { title, message = "", confirmLabel = "Aceptar", cancelLabel = "Cancelar", danger = false } = opts;
  const reply = (yes: boolean) => { answer.current = yes; ref.current?.close(); };

  return (
    <Dialog
      id="confirm-dlg"
      className="dlg dlg-confirm"
      onOpen={dlg => {
        ref.current = dlg;
        dlg.querySelector<HTMLButtonElement>('[data-answer="no"]')?.focus(); // por defecto, la opción segura
      }}
      onClose={() => onAnswer(answer.current)}
    >
      <h2>{title}</h2>
      {message && <p className="dlg-msg">{message}</p>}
      <div className="dlg-actions">
        <button className="btn" data-answer="no" onClick={() => reply(false)}>{cancelLabel}</button>
        <button className={`btn ${danger ? "danger-solid" : "primary"}`} data-answer="yes" onClick={() => reply(true)}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}
