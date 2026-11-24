// «Hilemos en tu móvil»: las dos formas de tenerla como app, una para Android y otra para iPhone, con la del móvil
// que se está usando primero y resaltada. Se abre sola al entrar desde el navegador de un móvil (salvo «Ahora no»
// hace poco) y desde «Tu perfil». Una sola ventana para toda la app (InstallHost, en Shell).
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PLAY_PUBLISHED, PLAY_STORE_URL, canPromptInstall, installPlatform, promptInstall, shouldAutoOfferInstall, snoozeInstall,
  type InstallPlatform,
} from "../lib/install";
import { bem } from "../lib/util";
import { useUi } from "../state/ui";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

/** Espera antes de ofrecerla sola, para no tapar la pantalla nada más entrar. */
const AUTO_DELAY_MS = 2500;

export function InstallHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("hilemos-install", on);
    // Sola, una vez, si no hay ya otra ventana abierta (el nombre, la clave de acceso…).
    const t = shouldAutoOfferInstall()
      ? window.setTimeout(() => { if (!document.querySelector("dialog[open]")) setOpen(true); }, AUTO_DELAY_MS)
      : 0;
    return () => { window.removeEventListener("hilemos-install", on); clearTimeout(t); };
  }, []);
  return open ? <InstallDialog onClose={() => setOpen(false)} /> : null;
}

function InstallDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useUi();
  const dlg = useRef<HTMLDialogElement | null>(null);
  const here = installPlatform();
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const close = (snooze: boolean) => { if (snooze) snoozeInstall(); dlg.current?.close(); };

  async function install() {
    if (await promptInstall()) { toast("Hilemos instalada"); close(true); }
    setCanPrompt(canPromptInstall());
  }

  const android = (
    <section key="android" className={bem("install__option", { here: here === "android" })} aria-labelledby="install-android">
      <h3 className="install__name" id="install-android"><Icon name="download" /> Android</h3>
      {PLAY_PUBLISHED ? <>
        <p className="install__text">Descárgala gratis en Google Play.</p>
        <a className="btn btn--primary install__btn" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => close(true)}>Descargar en Google Play</a>
      </> : <>
        <p className="install__text">Muy pronto en Google Play. Mientras tanto, puedes instalarla desde el navegador.</p>
        {canPrompt && here === "android"
          ? <button type="button" className="btn btn--primary install__btn" onClick={install}>Instalar Hilemos</button>
          : <ol className="install__steps"><li>En Chrome, pulsa el menú <strong>⋮</strong>.</li><li>Elige <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.</li></ol>}
      </>}
    </section>
  );
  const ios = (
    <section key="ios" className={bem("install__option", { here: here === "ios" })} aria-labelledby="install-ios">
      <h3 className="install__name" id="install-ios"><Icon name="share" /> iPhone</h3>
      <p className="install__text">Añádela a tu pantalla de inicio: se abre como una app más y recibe avisos.</p>
      <ol className="install__steps">
        <li>Abre <strong>hilemos.web.app</strong> en Safari.</li>
        <li>Pulsa <strong>Compartir</strong> <Icon name="share" className="install__inline-icon" /> (abajo, o arriba en el iPad).</li>
        <li>Elige <strong>«Añadir a pantalla de inicio»</strong> y pulsa <strong>«Añadir»</strong>.</li>
      </ol>
    </section>
  );
  const order: Record<InstallPlatform, ReactNode[]> = { android: [android, ios], ios: [ios, android], desktop: [android, ios] };

  return (
    <Dialog className="dialog install" onClose={onClose} onOpen={d => { dlg.current = d; }}>
      <button className="dialog__close" aria-label="Cerrar" onClick={() => close(true)}>×</button>
      <h2 className="dialog__title">Hilemos en tu móvil</h2>
      <p className="dialog__sub">
        Tenla a mano como una app más: se abre a pantalla completa y te avisa cuando pase algo en tus votaciones.
      </p>
      <div className="install__options">{order[here]}</div>
      <div className="dialog__actions">
        <button type="button" className="btn dialog__btn" onClick={() => close(true)}>Ahora no</button>
      </div>
    </Dialog>
  );
}
