// Se abre el enlace del correo: completa la entrada (o guarda en ese correo la cuenta sin registro abierta).
// Si se abre en otro dispositivo no se sabe a qué correo se mandó y se pregunta; si la cuenta es nueva, el nombre.
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Store } from "../lib/types";
import { errMsg } from "../lib/util";
import { makeAccessKey } from "../state/accessKey";
import { LogoMark } from "./LogoMark";
import { Icon } from "./Icon";

type Step = "checking" | "email" | "name" | "error";

/** Quita de la dirección los datos del enlace (?correo=1&oobCode=…) y deja la ruta (#/v/…). */
function cleanUrl() {
  history.replaceState(null, "", location.pathname + location.hash);
}

export function EmailLinkFinish({ store, url, onDone }: {
  store: Store;
  url: string;
  /** Terminado; `name`: el nombre elegido si la cuenta era nueva. */
  onDone: (name?: string) => void;
}) {
  const [step, setStep] = useState<Step>("checking");
  const [email, setEmail] = useState(() => store.pendingLinkEmail());
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState("");
  const started = useRef(false);

  const finish = async (mail: string) => {
    setBusy(true);
    setStatus("");
    try {
      const r = await store.completeEmailLink(mail.trim(), url);
      cleanUrl();
      // La cuenta sin registro se ha guardado en el correo: se recarga para verla ya como cuenta con correo.
      if (r.linked) { location.reload(); return; }
      if (r.needsName) { setUid(r.uid); setStep("name"); setBusy(false); return; }
      onDone();
    } catch (e) {
      cleanUrl();
      // Si se quitó la clave para guardar el correo y no se pudo, se le da una nueva para no dejarle sin acceso.
      if ((e as { keyRemoved?: boolean })?.keyRemoved) makeAccessKey(store);
      setStatus(errMsg(e));
      setStep("error");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (email) void finish(email);
    else setStep("email");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitEmail = (e: FormEvent) => { e.preventDefault(); if (email.trim() && !busy) void finish(email); };
  const submitName = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    // En la sesión y en el perfil (que es el que manda en el nombre visible).
    await Promise.all([
      store.setDisplayName(n).catch(() => {}),
      store.saveProfile(uid, { name: n, updatedAt: Date.now() }).catch(() => {}),
    ]);
    onDone(n);
  };

  return (
    <div id="gate">
      <div className="gate-card">
        <LogoMark className="gate-logo" size={72} />
        <h1><span className="wm-hile">Hile</span><span className="wm-mos">mos</span></h1>
        {step === "checking" && <p>Comprobando el enlace…</p>}
        {step === "email" && (
          <form className="gate-anon" onSubmit={submitEmail}>
            <p>Para terminar de entrar, confirma el correo al que te mandamos el enlace.</p>
            <input className="input" type="email" autoComplete="email" placeholder="tu@correo.com" required autoFocus
              data-error="Escribe el correo al que te mandamos el enlace."
              value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
          </form>
        )}
        {step === "name" && (
          <form className="gate-anon" onSubmit={submitName}>
            <p><Icon name="check" /> Ya has entrado con tu correo. ¿Cómo quieres que te vean los demás?</p>
            <input className="input" maxLength={40} placeholder="Tu nombre" autoComplete="nickname" required autoFocus
              data-error="Escribe el nombre que verán los demás."
              value={name} onChange={e => setName(e.target.value)} />
            <button className="btn primary" type="submit" disabled={busy}>Continuar</button>
          </form>
        )}
        {step === "error" && <>
          <p>No se pudo completar la entrada con el enlace.</p>
          <button className="btn" onClick={() => onDone()}>Volver</button>
        </>}
        <div id="gate-status" role="alert">{status}</div>
      </div>
    </div>
  );
}
