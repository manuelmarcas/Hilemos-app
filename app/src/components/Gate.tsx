// Pantalla de entrada: con Google, con un enlace al correo, sin cuenta (un nombre y, después, una clave de acceso)
// o con esa clave para volver a la misma cuenta. En modo demo, solo con un nombre.
import { useState, type FormEvent } from "react";
import type { Store } from "../lib/types";
import { errMsg } from "../lib/util";
import { useHashPath } from "../state/route";
import { LogoMark } from "./LogoMark";
import { Icon } from "./Icon";
import { makeAccessKey } from "../state/accessKey";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.8 13.6-4.8l-6.3-5.3c-2.1 1.4-4.8 2.3-7.3 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C40.9 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);

export function Gate({ store, demo }: { store: Store; demo: boolean }) {
  const path = useHashPath();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // Qué formulario se ve: el principal (nombre para entrar sin cuenta), el del correo o el de la clave.
  const [mode, setMode] = useState<"main" | "email" | "key">("main");
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState(""); // correo al que se acaba de mandar el enlace
  const go = (m: typeof mode) => { setMode(m); setStatus(""); setSentTo(""); };
  const invited = path.startsWith("/v/");

  const login = async () => {
    setStatus("");
    try { await store.signIn(); }
    catch (e) { setStatus("No se pudo iniciar sesión. " + errMsg(e)); }
  };

  const demoLogin = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n) await store.signIn({ name: n });
  };

  const anonLogin = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setStatus("");
    try { await store.signIn({ name: n, anonymous: true }); }
    catch (err) {
      setStatus("No se pudo entrar sin cuenta. " + errMsg(err));
      setBusy(false);
      return;
    }
    // Ya hay sesión (la app pasa a la pantalla principal): se crea la clave y la enseña AccessKeyDialog.
    makeAccessKey(store);
  };

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim();
    if (!mail || busy) return;
    setBusy(true);
    setStatus("");
    try { await store.sendEmailLink(mail); setSentTo(mail); }
    catch (err) { setStatus("No se pudo mandar el enlace. " + errMsg(err)); }
    setBusy(false);
  };

  const keyLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true);
    setStatus("");
    try { await store.signInWithKey(key); }
    catch (err) {
      setStatus(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div id="gate">
      <div className="gate-card">
        <LogoMark className="gate-logo" size={72} />
        <h1><span className="wm-hile">Hile</span><span className="wm-mos">mos</span></h1>
        <p id="gate-text">
          {invited
            ? demo
              ? "Te han invitado a una votación. Entra para ver el calendario y votar; se guardará en tu menú."
              : "Te han invitado a una votación. Entra con Google y se guardará en tu menú, o entra sin cuenta en un momento."
            : "Crea votaciones de horas, días, semanas o meses, compártelas con tu grupo y mira los resultados en directo."}
        </p>
        {demo ? (
          <form id="demo-login" onSubmit={demoLogin}>
            <input id="demo-name" className="input" maxLength={40} placeholder="Tu nombre" autoComplete="off" required autoFocus
              value={name} onChange={e => setName(e.target.value)} />
            <button className="btn primary" type="submit">Entrar</button>
          </form>
        ) : (
          <>
            {/* Al pedir el correo o la clave solo se ve su formulario: Google despistaría (es otra forma de entrar). */}
            {mode === "main" && (
              <button className="google-btn" id="login" onClick={login}>
                <GoogleIcon />
                Entrar con Google
              </button>
            )}
            {mode === "main" && (
              <button className="btn gate-alt" onClick={() => go("email")}><Icon name="mail" /> Entrar con tu correo</button>
            )}
            {mode === "email" && (sentTo ? (
              <div className="gate-anon gate-sent" role="status">
                <p><Icon name="mail" /> Te hemos mandado un enlace a <strong>{sentTo}</strong>. Ábrelo en este dispositivo para
                  entrar. Si no lo ves, mira en «Spam» o «Promociones».</p>
                <button type="button" className="link-btn gate-switch" onClick={() => setSentTo("")}>Usar otro correo</button>
              </div>
            ) : (
              <form className="gate-anon" onSubmit={sendLink}>
                <label className="gate-label" htmlFor="email-input">Entra con tu correo, sin contraseña</label>
                <input id="email-input" className="input" type="email" autoComplete="email" placeholder="tu@correo.com"
                  required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
                <p className="gate-anon-note">Te mandaremos un enlace: al pulsarlo, entras. Sirve en cualquier dispositivo.</p>
                <button className="btn primary" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviarme el enlace"}</button>
              </form>
            ))}
            {mode === "key" && (
              <form className="gate-anon" onSubmit={keyLogin}>
                <label className="gate-label" htmlFor="key-input">Tu clave de acceso</label>
                <input id="key-input" className="input key-input" maxLength={30} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus required
                  value={key} onChange={e => setKey(e.target.value)} />
                <button className="btn primary" type="submit" disabled={busy}>{busy ? "Comprobando…" : "Entrar con mi clave"}</button>
              </form>
            )}
            {mode === "main" ? <>
              <div className="gate-or"><span>o sin registrarte</span></div>
              <form className="gate-anon" onSubmit={anonLogin}>
                <input id="anon-name" className="input" maxLength={40} placeholder="Tu nombre" autoComplete="off" required
                  aria-label="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
                <p className="gate-anon-note">
                  <Icon name="key" /> Al continuar, Hilemos te dará una <strong>clave de acceso</strong>. Guárdala: es lo
                  único que te permitirá volver a entrar con esta cuenta si cierras sesión, desinstalas la app o
                  cambias de móvil. En las votaciones privadas o con aprobación hace falta Google o tu correo.
                </p>
                <button className="btn" type="submit" disabled={busy}>{busy ? "Entrando…" : "Continuar sin cuenta"}</button>
              </form>
              <button className="btn small gate-key-btn" onClick={() => go("key")}><Icon name="key" /> Tengo una clave de acceso</button>
            </> : (
              <button type="button" className="link-btn gate-switch" onClick={() => go("main")}>
                <Icon name="back" /> Otras formas de entrar
              </button>
            )}
          </>
        )}
        <div id="gate-status" role="alert">{status}</div>
      </div>
    </div>
  );
}
