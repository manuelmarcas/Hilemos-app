// «Denunciar mensaje» del chat: el motivo y, si se quiere, un comentario. La denuncia la ven quienes administran la
// votación (pueden ocultar el mensaje o expulsar a quien lo escribió) y quien modera Hilemos.
import { useRef, useState } from "react";
import { MAX_REPORT_COMMENT, REPORT_REASONS } from "../lib/model";
import type { ChatMessage, ReportReason } from "../lib/types";
import { errMsg } from "../lib/util";
import { Dialog } from "./Dialog";

export function ReportDialog({ msg, name, onSend, onClose }: {
  msg: ChatMessage;
  /** Nombre con el que se ve a quien lo escribió. */
  name: string;
  onSend: (reason: ReportReason, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dlg = useRef<HTMLDialogElement | null>(null);

  const send = async () => {
    if (!reason) { setErr("Elige un motivo."); return; }
    setBusy(true);
    setErr("");
    try {
      await onSend(reason, comment.trim());
      dlg.current?.close();
    } catch (e) {
      setErr((e as { code?: string })?.code === "already-exists"
        ? "Ya habías denunciado este mensaje." : "No se pudo enviar la denuncia. " + errMsg(e));
      setBusy(false);
    }
  };

  return (
    <Dialog className="dialog report-dialog" onClose={onClose}
      onOpen={d => { dlg.current = d; d.querySelector<HTMLInputElement>("input[type=radio]")?.focus(); }}>
      <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
      <h2 className="dialog__title">Denunciar mensaje</h2>
      <blockquote className="report-dialog__quote">
        <strong>{name}:</strong> {msg.text}
      </blockquote>
      <fieldset className="report-dialog__reasons">
        <legend className="field-label">¿Qué pasa con este mensaje?</legend>
        {(Object.keys(REPORT_REASONS) as ReportReason[]).map(r => (
          <label key={r} className="report-dialog__reason">
            <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => { setReason(r); setErr(""); }} />
            {REPORT_REASONS[r]}
          </label>
        ))}
      </fieldset>
      <label className="field-label report-dialog__label" htmlFor="report-comment">Comentario <span className="muted">(opcional)</span></label>
      <textarea id="report-comment" className="input" rows={2} maxLength={MAX_REPORT_COMMENT} value={comment}
        onChange={e => setComment(e.target.value)} />
      <p className="dialog__msg report-dialog__note">
        La verán quienes administran la votación, que pueden ocultar el mensaje o expulsar a quien lo escribió, y el
        equipo de Hilemos.
      </p>
      <div className="status" role="alert">{err}</div>
      <div className="dialog__actions">
        <button type="button" className="btn dialog__btn" onClick={() => dlg.current?.close()}>Cancelar</button>
        <button type="button" className="btn btn--danger-solid dialog__btn" disabled={busy} onClick={send}>
          {busy ? "Enviando…" : "Enviar denuncia"}
        </button>
      </div>
    </Dialog>
  );
}
