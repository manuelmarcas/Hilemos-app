// Pide el nombre a las cuentas que no tienen (las que entran con un enlace al correo no lo traen). Va en Shell,
// así que sale en cualquier pantalla y vuelve a salir hasta que se ponga, aunque se cierre la app a medias.
import { useState, type FormEvent } from "react";
import { useSession } from "../state/session";
import { errMsg } from "../lib/util";
import { Dialog } from "./Dialog";

export function NameDialog() {
  const { store, user, updateUser } = useSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  if (!user.needsName) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setStatus("");
    try {
      // El perfil es el que manda en el nombre visible; la sesión lo lleva por si el perfil tarda en leerse.
      await store.saveProfile(user.uid, { name: n, updatedAt: Date.now() });
      await store.setDisplayName(n).catch(() => {});
      updateUser({ name: n, needsName: false });
    } catch (err) {
      setStatus("No se pudo guardar el nombre. " + errMsg(err));
      setBusy(false);
    }
  };

  return (
    <Dialog className="dlg dlg-confirm" dismissable={false} onClose={() => {}}
      onOpen={dlg => dlg.querySelector<HTMLInputElement>("input")?.focus()}>
      <h2>¿Cómo quieres que te vean los demás?</h2>
      <p className="dlg-msg">Es el nombre que saldrá en las votaciones y en la tabla de participantes. Puedes cambiarlo cuando quieras en «Tu perfil».</p>
      <form onSubmit={save}>
        <input className="input name-dlg-input" maxLength={40} placeholder="Tu nombre" autoComplete="nickname" required
          data-error="Escribe el nombre que verán los demás." value={name} onChange={e => setName(e.target.value)} />
        <div className="status" role="alert">{status}</div>
        <div className="dlg-actions">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Dialog>
  );
}
