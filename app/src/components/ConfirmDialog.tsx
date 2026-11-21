import { useRef, useState } from "react";
import { Dialog } from "./Dialog";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Si se indica, se muestra una casilla con este texto (p. ej. "No volver a mostrar"). */
  checkbox?: string;
}

export interface ConfirmResult {
  ok: boolean;
  checked: boolean;
}

// Ventana de confirmación propia (en vez de window.confirm).
export function ConfirmDialog({ opts, onAnswer }: { opts: ConfirmOptions; onAnswer: (r: ConfirmResult) => void }) {
  const answer = useRef(false);
  const ref = useRef<HTMLDialogElement | null>(null);
  const [checked, setChecked] = useState(false);
  const checkedRef = useRef(false);
  const { title, message = "", confirmLabel = "Aceptar", cancelLabel = "Cancelar", danger = false, checkbox } = opts;
  const reply = (yes: boolean) => { answer.current = yes; ref.current?.close(); };

  return (
    <Dialog
     
      className="dlg dlg-confirm"
      onOpen={dlg => {
        ref.current = dlg;
        dlg.querySelector<HTMLButtonElement>('[data-answer="no"]')?.focus(); // por defecto, la opción segura
      }}
      onClose={() => onAnswer({ ok: answer.current, checked: checkedRef.current })}
    >
      <h2>{title}</h2>
      {message && <p className="dlg-msg">{message}</p>}
      {checkbox && (
        <label className="dlg-check">
          <input type="checkbox" checked={checked} onChange={e => { setChecked(e.target.checked); checkedRef.current = e.target.checked; }} />
          {checkbox}
        </label>
      )}
      <div className="dlg-actions">
        <button className="btn" data-answer="no" onClick={() => reply(false)}>{cancelLabel}</button>
        <button className={`btn ${danger ? "danger-solid" : "primary"}`} data-answer="yes" onClick={() => reply(true)}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}
