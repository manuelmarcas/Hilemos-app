// Pantalla de entrada: login con Google, sin cuenta (solo un nombre) o, en modo demo, con un nombre.
import { useState, type FormEvent } from "react";
import type { Store } from "../lib/types";
import { errMsg } from "../lib/util";
import { useHashPath } from "../state/route";
import { LogoMark } from "./LogoMark";

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
            <button className="google-btn" id="login" onClick={login}>
              <GoogleIcon />
              Entrar con Google
            </button>
            <form className="gate-anon" onSubmit={anonLogin}>
              <div className="gate-or"><span>o</span></div>
              <input id="anon-name" className="input" maxLength={40} placeholder="Tu nombre" autoComplete="off" required
                value={name} onChange={e => setName(e.target.value)} />
              <button className="btn" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar sin cuenta"}</button>
              <p className="gate-anon-note">
                Solo con tu nombre, sin registrarte. Tus votaciones y tus votos se quedan en este dispositivo: si
                cambias de móvil o borras los datos del navegador, los pierdes. Puedes guardarlos en tu cuenta de
                Google cuando quieras desde «Tu perfil». En las votaciones privadas o con aprobación hace falta Google.
              </p>
            </form>
          </>
        )}
        <div id="gate-status" role="alert">{status}</div>
      </div>
    </div>
  );
}
