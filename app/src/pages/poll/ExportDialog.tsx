// «Exportar resultados» (administradores, desde el menú ⋯): CSV para guardar la votación, Excel con formato y un
// informe en PDF para presentar o imprimir.
import { useRef, useState } from "react";
import { exportResults, type ExportFormat } from "../../lib/exportResults";
import type { Tally, TiebreakTally } from "../../lib/model";
import type { Poll } from "../../lib/types";
import { errMsg } from "../../lib/util";
import { Dialog } from "../../components/Dialog";
import { Icon, type IconName } from "../../components/Icon";
import { PremiumNote, PremiumTag } from "../../components/Premium";
import { useSession } from "../../state/session";

const FORMATS: { id: ExportFormat; icon: IconName; title: string; text: string; premium?: boolean }[] = [
  { id: "csv", icon: "download", title: "CSV", text: "Para guardar la votación y abrirla en cualquier hoja de cálculo." },
  { id: "xlsx", icon: "download", title: "Excel", premium: true, text: "Con formato: la clasificación, lo que votó cada persona y los participantes, en hojas separadas." },
  { id: "pdf", icon: "download", title: "PDF", premium: true, text: "Un informe con la ganadora, la clasificación y quién votó cada opción, para presentar o imprimir." },
];

export function ExportDialog({ poll, T, TB, onClose, toast }: {
  poll: Poll; T: Tally; TB: TiebreakTally | null; onClose: () => void; toast: (m: string) => void;
}) {
  const { store } = useSession();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [err, setErr] = useState("");
  const dlg = useRef<HTMLDialogElement | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setErr("");
    try {
      if (await exportResults(poll, T, TB, format) === "downloaded") toast("Archivo descargado");
      store.track(format);
      dlg.current?.close();
    } catch (e) {
      setErr("No se pudo generar el archivo. " + errMsg(e));
      setBusy(null);
    }
  };

  return (
    <Dialog className="dialog export-dialog" onClose={onClose} onOpen={d => { dlg.current = d; }}>
      <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
      <h2 className="dialog__title">Exportar resultados</h2>
      <p className="dialog__sub">{poll.anonymous ? "Es anónima: solo se exportan los totales, sin nombres." : poll.title}</p>
      <div className="export-dialog__list">
        {FORMATS.map(f => (
          <button key={f.id} type="button" className="export-dialog__option" disabled={!!busy} onClick={() => run(f.id)}>
            <Icon name={f.icon} className="export-dialog__icon" />
            <span className="export-dialog__text">
              <strong className="export-dialog__name">{busy === f.id ? "Generando…" : f.title}{f.premium && <> <PremiumTag feature="export" nested /></>}</strong>
              <span className="export-dialog__desc">{f.text}</span>
            </span>
          </button>
        ))}
      </div>
      <PremiumNote />
      <div className="status" role="alert">{err}</div>
    </Dialog>
  );
}
