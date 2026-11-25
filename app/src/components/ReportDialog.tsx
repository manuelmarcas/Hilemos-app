// Ventana de denuncia: el motivo y, si se quiere, un comentario. Sirve para un mensaje del chat («Denunciar mensaje»)
// y para una persona (desde su perfil). La denuncia la ven quienes administran la votación (pueden ocultar el mensaje
// o expulsar a la persona) y quien modera Hilemos.
import { useRef, useState, type ReactNode } from "react";
import { MAX_REPORT_COMMENT, REPORT_REASONS } from "../lib/model";
import type { ReportReason } from "../lib/types";
import { errMsg } from "../lib/util";
import { CharCount } from "./CharCount";
import { Dialog } from "./Dialog";
import { useAutoGrow } from "../hooks/useAutoGrow";

/** Alto máximo del comentario (unas 6 líneas). */
const COMMENT_MAX = 160;

export function ReportDialog({ title, quote, question, note, already, onSend, onClose }: {
  title: string;
  /** Lo que se denuncia, tal como se ve: el mensaje con su autor, o la persona con su foto. */
  quote: ReactNode;
  /** Pregunta encima de los motivos («¿Qué pasa con este mensaje?»). */
  question: string;
  /** Quién verá la denuncia y qué puede hacer. */
  note: string;
  /** Error si ya se había denunciado. */
  already: string;
  onSend: (reason: ReportReason, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dlg = useRef<HTMLDialogElement | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(commentRef, comment, COMMENT_MAX);

  const send = async () => {
    if (!reason) { setErr("Elige un motivo."); return; }
    setBusy(true);
    setErr("");
    try {
      await onSend(reason, comment.trim());
      dlg.current?.close();
    } catch (e) {
      setErr((e as { code?: string })?.code === "already-exists" ? already : "No se pudo enviar la denuncia. " + errMsg(e));
      setBusy(false);
    }
  };

  return (
    <Dialog className="dialog report-dialog" onClose={onClose}
      onOpen={d => { dlg.current = d; d.querySelector<HTMLInputElement>("input[type=radio]")?.focus(); }}>
      <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
      <h2 className="dialog__title">{title}</h2>
      <blockquote className="report-dialog__quote">{quote}</blockquote>
      <fieldset className="report-dialog__reasons">
        <legend className="field-label">{question}</legend>
        {(Object.keys(REPORT_REASONS) as ReportReason[]).map(r => (
          <label key={r} className="report-dialog__reason">
            <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => { setReason(r); setErr(""); }} />
            {REPORT_REASONS[r]}
          </label>
        ))}
      </fieldset>
      <label className="field-label report-dialog__label" htmlFor="report-comment">Comentario <span className="muted">(opcional)</span></label>
      <textarea ref={commentRef} id="report-comment" className="input input--area" rows={2} maxLength={MAX_REPORT_COMMENT} value={comment}
        onChange={e => setComment(e.target.value)} />
      <CharCount value={comment} max={MAX_REPORT_COMMENT} />
      <p className="dialog__msg report-dialog__note">{note}</p>
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
