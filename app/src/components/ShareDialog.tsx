// Diálogo "Compartir votación": enlace, QR, menú nativo del móvil, WhatsApp, Telegram y correo.
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { copyText } from "../lib/util";

export interface ShareTarget {
  url: string;
  title: string;
}

// Dibuja el QR en un canvas (para mostrarlo y descargarlo como PNG).
async function qrCanvas(text: string, px = 8, margin = 4) {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const size = (n + margin * 2) * px;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#451d42";
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(r, col)) g.fillRect((col + margin) * px, (r + margin) * px, px, px);
    }
  }
  return c;
}

const slugFile = (s: string) => (s || "votacion").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "votacion";

export function ShareDialog({ target, onClose, toast }: { target: ShareTarget; onClose: () => void; toast: (m: string) => void }) {
  const { url, title } = target;
  const [qr, setQr] = useState<{ png: string } | { error: string } | null>(null);
  const dlgRef = useRef<HTMLDialogElement | null>(null);
  const text = `¡Vota en «${title}»!`;
  const enc = encodeURIComponent;
  const canShare = typeof navigator.share === "function";

  useEffect(() => {
    let alive = true;
    qrCanvas(url)
      .then(c => { if (alive) setQr({ png: c.toDataURL("image/png") }); })
      .catch(() => { if (alive) setQr({ error: "No se pudo cargar el generador de QR" }); });
    return () => { alive = false; };
  }, [url]);

  const download = () => {
    if (!qr || !("png" in qr)) return;
    const a = document.createElement("a");
    a.href = qr.png;
    a.download = `qr-${slugFile(title)}.png`;
    a.click();
  };

  return (
    <Dialog
      id="share-dlg"
      className="dlg"
      onClose={onClose}
      onOpen={dlg => { dlgRef.current = dlg; dlg.querySelector("input")?.select(); }}
    >
      <button className="dlg-x" aria-label="Cerrar" onClick={() => dlgRef.current?.close()}>×</button>
      <h2>Compartir votación</h2>
      <p className="dlg-sub">{title}</p>
      <div className="share-link">
        <input className="input" readOnly value={url} aria-label="Enlace de la votación" />
        <button className="btn primary" onClick={async () => { if (await copyText(url)) toast("Enlace copiado"); }}>Copiar</button>
      </div>
      <div className="qr-box" id="qr-box">
        {!qr ? <span className="muted">Generando QR…</span>
          : "png" in qr ? <img src={qr.png} alt="Código QR de la votación" />
          : <span className="status">{qr.error}</span>}
      </div>
      <div className="share-btns">
        {canShare && (
          <button className="btn" onClick={async () => { try { await navigator.share({ title, text, url }); } catch { /* cancelado */ } }}>
            📤 Compartir…
          </button>
        )}
        <a className="btn" target="_blank" rel="noopener" href={`https://wa.me/?text=${enc(`${text} ${url}`)}`}>💬 WhatsApp</a>
        <a className="btn" target="_blank" rel="noopener" href={`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`}>✈️ Telegram</a>
        <a className="btn" href={`mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`}>✉️ Correo</a>
        <button className="btn" disabled={!qr || !("png" in qr)} onClick={download}>⬇️ Descargar QR</button>
      </div>
      <p className="dlg-note">Quien abra el enlace (o escanee el QR) e inicie sesión quedará como participante y la votación aparecerá en su menú.</p>
    </Dialog>
  );
}
