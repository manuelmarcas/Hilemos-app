// Pantalla "Tu perfil": nombre visible, imagen de perfil y preferencias.
import { useRef, useState } from "react";
import { errMsg, imageToAvatar } from "../lib/util";
import { getThemePref, setThemePref, type ThemePref } from "../lib/theme";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { forgetProfile } from "../state/profiles";
import { Avatar } from "../components/Avatar";

const THEMES: [ThemePref, string, string, string][] = [
  ["auto", "🌗", "Automático", "Como tu dispositivo"],
  ["light", "☀️", "Claro", "Fondo claro"],
  ["dark", "🌙", "Oscuro", "Fondo oscuro"],
];

export function Profile() {
  const { store, user, updateUser } = useSession();
  const { toast } = useUi();
  const [name, setName] = useState(user.name || "");
  const [photo, setPhoto] = useState(user.photo || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [theme, setTheme] = useState(getThemePref);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  async function save() {
    if (busy) return;
    const n = name.trim();
    if (!n) { setStatus("Escribe el nombre que quieres mostrar."); nameRef.current?.focus(); return; }
    setBusy(true);
    setStatus("");
    try {
      // Solo el perfil: todas las votaciones muestran el nombre y la imagen que haya en él.
      await store.saveProfile(user.uid, { name: n, photo, updatedAt: Date.now() });
      forgetProfile(user.uid);
      updateUser({ name: n, photo });
      toast("Perfil guardado");
    } catch (e) {
      setStatus("No se pudo guardar el perfil. " + errMsg(e));
    }
    setBusy(false);
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await imageToAvatar(file));
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message || "No se pudo leer la imagen.");
    }
  };

  return (
    <>
      <div className="page-head">
        <a className="back" href="#/">← Volver</a>
        <h1>Tu perfil</h1>
      </div>
      <div className="profile">
        <section className="step">
          <h2>Imagen de perfil</h2>
          <div className="avatar-edit">
            <div id="pf-avatar"><Avatar name={name} photo={photo} size={96} seed={user.uid} /></div>
            <div className="avatar-btns">
              <button className="btn" onClick={() => fileRef.current?.click()}>📷 Subir imagen</button>
              {user.googlePhoto && <button className="btn" onClick={() => setPhoto(user.googlePhoto)}>Usar la foto de Google</button>}
              <button className="btn danger" onClick={() => setPhoto("")}>Quitar imagen</button>
              <input ref={fileRef} type="file" id="pf-file" accept="image/*" hidden
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; onFile(f); }} />
            </div>
          </div>
          <p className="hint hint-after">Se recorta en cuadrado y se reduce automáticamente. Sin imagen, se muestra tu inicial.</p>
        </section>
        <section className="step">
          <h2><label htmlFor="pf-name">Nombre visible</label></h2>
          <input ref={nameRef} id="pf-name" className="input big" maxLength={40} value={name} autoComplete="nickname"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); save(); } }} />
          <p className="hint hint-after">Es el nombre que verán los demás en las votaciones y en la tabla de participantes.</p>
        </section>
        <div className="profile-bar">
          <button className="btn primary big" id="pf-save" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar cambios"}</button>
          <div className="status" id="pf-status" role="alert">{status}</div>
        </div>
        <section className="step" id="pf-prefs">
          <h2>Preferencias</h2>
          <h3 className="pref-label" id="pf-theme-label">Tema</h3>
          <div className="theme-pick" id="pf-theme" role="group" aria-labelledby="pf-theme-label">
            {THEMES.map(([id, icon, label, desc]) => (
              <button key={id} type="button" className={`type-card ${theme === id ? "on" : ""}`} aria-pressed={theme === id}
                onClick={() => { setThemePref(id); setTheme(id); }}>
                <span className="type-icon" aria-hidden="true">{icon}</span>
                <span className="type-name">{label}</span>
                <span className="type-desc">{desc}</span>
              </button>
            ))}
          </div>
          <p className="hint hint-after">Se aplica al momento y se recuerda en este dispositivo.</p>
        </section>
      </div>
    </>
  );
}
