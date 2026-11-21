// Enseña la clave de acceso recién creada (cuentas sin registro). No se cierra hasta marcar que se ha guardado:
// el servidor solo guarda su huella, así que después no se puede volver a ver (solo crear otra).
import { useState } from "react";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { dismissAccessKey, makeAccessKey, useNewKey } from "../state/accessKey";
import { canShareLink, isNative, shareLink } from "../lib/native";
import { copyText } from "../lib/util";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

export function AccessKeyDialog() {
  const k = useNewKey();
  const { store, user } = useSession();
  const { toast } = useUi();
  const [saved, setSaved] = useState(false);
  if (!k) return null;

  const text = (key: string) =>
    `Mi clave de acceso de Hilemos (cuenta «${user.name}»): ${key}\nSirve para volver a entrar con mi cuenta en «Entrar con tu clave».`;

  return (
    <Dialog className="dlg dlg-key" dismissable={k.status === "error"} onClose={() => { setSaved(false); dismissAccessKey(); }}>
      <h2><Icon name="key" /> Tu clave de acceso</h2>
      {k.status === "creating" && <p className="dlg-msg">Generando tu clave…</p>}
      {k.status === "error" && <>
        <p className="dlg-msg">No se pudo crear la clave. {k.error}</p>
        <p className="dlg-msg">Puedes volver a intentarlo ahora o más tarde desde «Tu perfil».</p>
        <div className="dlg-actions">
          <button className="btn" onClick={dismissAccessKey}>Más tarde</button>
          <button className="btn primary" onClick={() => makeAccessKey(store)}>Reintentar</button>
        </div>
      </>}
      {k.status === "ready" && <>
        <p className="dlg-msg">
          Cópiala y guárdala en un sitio seguro (en tus notas, en un mensaje a ti mismo…). Es lo único que te
          permitirá volver a entrar con esta cuenta si cierras sesión, desinstalas la app o cambias de móvil.
        </p>
        <div className="key-box" aria-label="Clave de acceso">{k.key}</div>
        <div className="key-btns">
          <button className="btn" onClick={async () => { toast(await copyText(k.key) ? "Clave copiada" : "No se pudo copiar: mantén pulsada la clave para seleccionarla y cópiala a mano"); }}>
            <Icon name="copy" /> Copiar
          </button>
          {canShareLink() && (
            <button className="btn" onClick={() => shareLink({ title: "Clave de acceso de Hilemos", text: text(k.key) })}>
              <Icon name="share" /> {isNative() ? "Compartir" : "Enviar…"}
            </button>
          )}
        </div>
        <p className="dlg-note">
          Por seguridad no se podrá volver a ver. Si la pierdes, en «Tu perfil» puedes crear otra (la anterior dejará
          de valer). No se la des a nadie: quien la tenga puede entrar como tú.
        </p>
        <label className="dlg-check key-check">
          <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />
          La he guardado
        </label>
        <div className="dlg-actions">
          <button className="btn primary" disabled={!saved} onClick={() => { setSaved(false); dismissAccessKey(); }}>Continuar</button>
        </div>
      </>}
    </Dialog>
  );
}
