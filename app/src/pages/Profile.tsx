// Pantalla "Tu perfil": nombre visible, imagen de perfil y preferencias.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { errMsg, imageToAvatar, makeThumb } from "../lib/util";
import { getThemePref, setThemePref, type ThemePref } from "../lib/theme";
import { disablePush, enablePush, isIos, isStandalone, pushState, type PushState } from "../lib/push";
import type { NotifyPrefs } from "../lib/types";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { Avatar } from "../components/Avatar";
import { Icon, type IconName } from "../components/Icon";
import { makeAccessKey } from "../state/accessKey";

const THEMES: [ThemePref, IconName, string, string][] = [
  ["auto", "themeAuto", "Automático", "Como tu dispositivo"],
  ["light", "sun", "Claro", "Fondo claro"],
  ["dark", "moon", "Oscuro", "Fondo oscuro"],
];

const NOTIFY: [keyof NotifyPrefs, string][] = [
  ["votes", "Alguien vota en una votación tuya"],
  ["state", "Se cierra, hay desempate o se acaba el plazo"],
  ["members", "Te aceptan, o alguien quiere entrar en una tuya"],
];

export function Profile() {
  const { store, user, updateUser, library } = useSession();
  const { toast, confirm } = useUi();
  const [name, setName] = useState(user.name || "");
  const [photo, setPhoto] = useState(user.photo || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [theme, setTheme] = useState(getThemePref);
  const [linking, setLinking] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  const [notify, setNotify] = useState<NotifyPrefs>({});
  const [pushBusy, setPushBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    pushState(store).then(s => { if (alive) setPush(s); });
    store.getProfile(user.uid)
      .then(p => { if (alive && p?.notify) setNotify(p.notify); })
      .catch(() => { /* sin perfil guardado: todos los avisos activados */ });
    return () => { alive = false; };
  }, [store, user.uid]);

  async function togglePush() {
    if (pushBusy) return;
    setPushBusy(true);
    setStatus("");
    try {
      if (push === "on") {
        await disablePush(store, user.uid);
        setPush("off");
        toast("Avisos desactivados en este dispositivo");
      } else if (await enablePush(store, user.uid)) {
        setPush("on");
        toast("Avisos activados en este dispositivo");
      } else {
        setPush(Notification.permission === "denied" ? "denied" : "off");
      }
    } catch (e) {
      setStatus("No se pudieron cambiar los avisos. " + errMsg(e));
    }
    setPushBusy(false);
  }

  function toggleNotify(key: keyof NotifyPrefs) {
    const next = { ...notify, [key]: notify[key] === false };
    setNotify(next);
    store.saveProfile(user.uid, { notify: next }).catch(e => setStatus("No se pudo guardar. " + errMsg(e)));
  }

  // Guardar la sesión sin cuenta en una cuenta de Google: conserva el uid, así que mantiene votos y votaciones.
  async function linkGoogle() {
    if (linking) return;
    setLinking(true);
    setStatus("");
    try {
      await store.linkGoogle();
      location.reload();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setStatus(code === "auth/credential-already-in-use"
        ? "Esa cuenta de Google ya se ha usado aquí. Sal y entra con ella: en esa cuenta están sus propias votaciones, y las de ahora se quedarán en este dispositivo."
        : "No se pudo guardar tu cuenta. " + errMsg(e));
      setLinking(false);
    }
  }

  // Guardar la cuenta sin registro en un correo: se manda el enlace y, al abrirlo aquí, se vincula (EmailLinkFinish).
  const [mail, setMail] = useState("");
  const [mailSent, setMailSent] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  const [mailErr, setMailErr] = useState("");
  async function sendMail(e: FormEvent) {
    e.preventDefault();
    const m = mail.trim();
    if (!m || mailBusy) return;
    setMailBusy(true);
    setMailErr("");
    try { await store.sendEmailLink(m); setMailSent(m); }
    catch (err) { setMailErr("No se pudo mandar el enlace. " + errMsg(err)); }
    setMailBusy(false);
  }

  async function newKey() {
    if (!(await confirm({
      title: "¿Crear una clave nueva?",
      message: "La clave que tengas ahora dejará de valer. Tendrás que guardar la nueva.",
      confirmLabel: "Crear clave nueva",
    }))) return;
    makeAccessKey(store);
  }

  async function save() {
    if (busy) return;
    const n = name.trim();
    if (!n) { setStatus("Escribe el nombre que quieres mostrar."); nameRef.current?.focus(); return; }
    setBusy(true);
    setStatus("");
    try {
      const thumb = await makeThumb(photo);
      await store.saveProfile(user.uid, { name: n, photo, thumb, updatedAt: Date.now() });
      updateUser({ name: n, photo, thumb, needsName: false });

      // El nombre y la miniatura van copiados en cada voto (así abrir una votación no lee perfiles):
      // si han cambiado, se actualizan en las votaciones del menú. Es raro, y cuesta una escritura por votación.
      const polls = library.data?.polls || {};
      const ids = Object.keys(polls);
      const jobs: Promise<unknown>[] = [];
      if (n !== user.name || thumb !== user.thumb) {
        ids.forEach(id => jobs.push(store.updateParticipant(id, user.uid, { name: n, photo: thumb })));
      }
      if (n !== user.name) {
        ids.filter(id => polls[id].role === "owner").forEach(id => {
          jobs.push(store.updatePoll(id, { ownerName: n }));
          jobs.push(store.saveLibraryEntry(user.uid, id, { ownerName: n }));
        });
      }
      await Promise.allSettled(jobs);
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
        <a className="back" href="#/"><Icon name="back" /> Volver</a>
        <h1>Tu perfil</h1>
      </div>
      <div className="profile">
        <section className="step">
          <h2>Imagen de perfil</h2>
          <div className="avatar-edit">
            <div id="pf-avatar"><Avatar name={name} photo={photo} size={96} seed={user.uid} /></div>
            <div className="avatar-btns">
              <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="camera" /> Subir imagen</button>
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
        {user.anon && store.mode === "firebase" && (
          <section className="step" id="pf-account">
            <h2>Tu cuenta</h2>
            <h3 className="pref-label">Clave de acceso</h3>
            <p className="hint">
              Has entrado sin registrarte. Para volver a entrar con esta cuenta si cierras sesión, desinstalas la app o
              cambias de móvil, necesitas tu clave de acceso. Por seguridad no se puede volver a ver: si no la
              tienes guardada, crea una nueva (la anterior dejará de valer).
            </p>
            <button className="btn" id="pf-key" onClick={newKey}><Icon name="key" /> Crear una clave nueva</button>
            <h3 className="pref-label pf-account-or">O guárdala con tu correo o con Google</h3>
            <p className="hint">
              Así no necesitas clave: entras con tu correo o con Google en cualquier sitio, sin perder nada de lo que ya
              has votado.
            </p>
            {mailSent ? (
              <p className="hint pf-mail-sent" role="status">
                <Icon name="mail" /> Te hemos mandado un enlace a <strong>{mailSent}</strong>. Ábrelo <strong>en este
                mismo dispositivo</strong> para guardar tu cuenta en ese correo.{" "}
                <button className="link-btn" onClick={() => setMailSent("")}>Usar otro correo</button>
              </p>
            ) : (
              <form className="pf-mail" onSubmit={sendMail}>
                <input className="input" type="email" autoComplete="email" placeholder="tu@correo.com" aria-label="Tu correo"
                  required data-error="Escribe tu correo para que te mandemos el enlace."
                  value={mail} onChange={e => setMail(e.target.value)} />
                <button className="btn" type="submit" disabled={mailBusy}><Icon name="mail" /> {mailBusy ? "Enviando…" : "Enviarme el enlace"}</button>
              </form>
            )}
            {mailErr && <div className="status" role="alert">{mailErr}</div>}
            <button className="btn pf-google" id="pf-link" disabled={linking} onClick={linkGoogle}>
              {linking ? "Guardando…" : "Guardar en mi cuenta de Google"}
            </button>
          </section>
        )}
        <section className="step" id="pf-prefs">
          <h2>Preferencias</h2>
          <h3 className="pref-label" id="pf-theme-label">Tema</h3>
          <div className="theme-pick" id="pf-theme" role="group" aria-labelledby="pf-theme-label">
            {THEMES.map(([id, icon, label, desc]) => (
              <button key={id} type="button" className={`type-card ${theme === id ? "on" : ""}`} aria-pressed={theme === id}
                onClick={() => { setThemePref(id); setTheme(id); }}>
                <span className="type-icon"><Icon name={icon} /></span>
                <span className="type-name">{label}</span>
                <span className="type-desc">{desc}</span>
              </button>
            ))}
          </div>
          <p className="hint hint-after">Se aplica al momento y se recuerda en este dispositivo.</p>
          {push && push !== "unconfigured" && (push !== "unsupported" || (isIos() && !isStandalone())) && (
            <div className="pref-block">
              <h3 className="pref-label" id="pf-notify-label">Avisos</h3>
              {push === "unsupported" && (
                <p className="hint">
                  Para recibir avisos en el iPhone, añade Hilemos a tu pantalla de inicio: pulsa «Compartir» en
                  Safari y luego «Añadir a pantalla de inicio». Después vuelve aquí y actívalos.
                </p>
              )}
              {push === "denied" && (
                <p className="hint">
                  Has bloqueado los avisos en este navegador. Para recibirlos, permítelos en los ajustes del sitio y
                  vuelve a esta pantalla.
                </p>
              )}
              {(push === "on" || push === "off") && <>
                <p className="hint">
                  Te avisamos en este dispositivo cuando pase algo en tus votaciones. Puedes quitarlos cuando quieras.
                </p>
                <button className="btn" id="pf-push" disabled={pushBusy} onClick={togglePush} aria-pressed={push === "on"}>
                  {pushBusy ? "Un momento…" : push === "on" ? <><Icon name="bellOff" /> Desactivar los avisos</> : <><Icon name="bell" /> Activar los avisos</>}
                </button>
              </>}
              {push === "on" && (
                <div className="notify-opts" role="group" aria-labelledby="pf-notify-label">
                  {NOTIFY.map(([key, label]) => (
                    <label key={key} className="dlg-check">
                      <input type="checkbox" checked={notify[key] !== false} onChange={() => toggleNotify(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
