// Arranque: crea el almacén de datos, sigue la sesión y elige entre la entrada (login) y la app.
import { useCallback, useEffect, useState } from "react";
import { firebaseConfig } from "./lib/config";
import { createDemoStore, createFirebaseStore } from "./lib/store";
import type { Store, User } from "./lib/types";
import { makeThumb } from "./lib/util";
import { SessionProvider } from "./state/session";
import { Gate } from "./components/Gate";
import { Shell } from "./components/Shell";
import { EmailLinkFinish } from "./components/EmailLinkFinish";
import { LegalStandalone } from "./pages/Legal";
import { legalDoc, useHashPath } from "./state/route";
import { LogoMark } from "./components/LogoMark";
import { NoticeBanner, UpdateRequired } from "./components/AppNotices";
import { useAppConfig } from "./state/appConfig";

const params = new URLSearchParams(location.search);
const DEMO = params.has("demo") || !firebaseConfig?.apiKey;

// Fuera del componente: se crea una sola vez aunque React monte dos veces en desarrollo.
const storePromise: Promise<Store> = DEMO ? Promise.resolve(createDemoStore()) : createFirebaseStore(firebaseConfig);

function DemoBanner() {
  let exit: string | null = null;
  if (firebaseConfig?.apiKey) {
    const url = new URL(location.href);
    url.searchParams.delete("demo");
    exit = url.toString();
  }
  return (
    <div id="demo-banner" className="demo-banner">
      <strong>Modo demo:</strong> los datos se guardan solo en este navegador. Abre otra pestaña y entra con otro nombre para simular a otra persona.
      {exit && <a className="demo-banner__link" href={exit}>Salir del modo demo</a>}
    </div>
  );
}

export function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [bootError, setBootError] = useState("");
  // undefined: aún no se sabe si hay sesión.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // La privacidad y las condiciones se leen también sin entrar (están enlazadas desde la entrada).
  const legal = legalDoc(useHashPath());

  // Enlace de entrada por correo pendiente de completar (abierto en la web o, en la app, recibido por appUrlOpen).
  const [emailLink, setEmailLink] = useState<string | null>(null);

  useEffect(() => {
    storePromise.then(s => {
      setStore(s);
      if (s.isEmailLink(location.href)) setEmailLink(location.href);
    }, e => setBootError(e?.message || String(e)));
    const onLink = (e: Event) => setEmailLink((e as CustomEvent<string>).detail);
    window.addEventListener("hilemos-email-link", onLink);
    return () => window.removeEventListener("hilemos-email-link", onLink);
  }, []);

  useEffect(() => {
    if (!store) return;
    let seq = 0;
    return store.onAuth(async authUser => {
      const mine = ++seq;
      if (!authUser) { setUser(null); return; }
      // El perfil (nombre e imagen elegidos por el usuario) tiene prioridad sobre los datos de Google.
      let profile = null, profileRead = false;
      try { profile = await store.getProfile(authUser.uid); profileRead = true; } catch { /* sin perfil: datos de Google */ }
      const photo = typeof profile?.photo === "string" ? profile.photo : authUser.photo;
      // Miniatura para los votos (los perfiles guardados antes de existir `thumb` no la tienen).
      const thumb = typeof profile?.thumb === "string" ? profile.thumb : await makeThumb(photo).catch(() => "");
      if (mine !== seq) return; // ha cambiado la sesión mientras tanto
      setUser({
        ...authUser,
        googlePhoto: authUser.photo,
        name: profile?.name || authUser.name,
        photo,
        thumb,
        // Solo si se ha podido leer el perfil: si falló la lectura, no se sabe si tiene nombre.
        needsName: profileRead && !profile?.name && !authUser.hasName,
      });
    });
  }, [store]);

  const updateUser = useCallback((patch: Partial<Omit<User, "uid">>) => {
    setUser(u => (u ? { ...u, ...patch } : u));
  }, []);

  // Versión mínima de la app y aviso para todos (config/app): se cambian sin publicar otra versión.
  const remote = useAppConfig(store);

  let content;
  if (remote.update) content = <UpdateRequired />;
  else if (bootError) content = <div className="boot"><div className="empty-box empty-box--error">No se pudo cargar la aplicación: {bootError}</div></div>;
  else if (!store || user === undefined) {
    content = <div className="boot" role="status" aria-label="Cargando Hilemos"><LogoMark className="boot__logo" eyeClassName="boot__eye" size={96} /></div>;
  }
  else if (emailLink) {
    content = <EmailLinkFinish store={store} url={emailLink} onDone={() => setEmailLink(null)} />;
  }
  else if (!user) content = legal ? <LegalStandalone doc={legal} /> : <Gate store={store} demo={DEMO} />;
  else {
    content = (
      <SessionProvider key={user.uid} store={store} demo={DEMO} user={user} updateUser={updateUser}>
        <Shell />
      </SessionProvider>
    );
  }

  return (
    <>
      {DEMO && <DemoBanner />}
      {remote.notice && !remote.update && <NoticeBanner notice={remote.notice} onClose={remote.closeNotice} />}
      {content}
    </>
  );
}
