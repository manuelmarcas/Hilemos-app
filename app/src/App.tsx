// Arranque: crea el almacén de datos, sigue la sesión y elige entre la entrada (login) y la app.
import { useCallback, useEffect, useState } from "react";
import { firebaseConfig } from "./lib/config";
import { createDemoStore, createFirebaseStore } from "./lib/store";
import type { Store, User } from "./lib/types";
import { makeThumb } from "./lib/util";
import { SessionProvider } from "./state/session";
import { Gate } from "./components/Gate";
import { Shell } from "./components/Shell";

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
      {exit && <a id="demo-exit" href={exit}>Salir del modo demo</a>}
    </div>
  );
}

export function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [bootError, setBootError] = useState("");
  // undefined: aún no se sabe si hay sesión.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    storePromise.then(setStore, e => setBootError(e?.message || String(e)));
  }, []);

  useEffect(() => {
    if (!store) return;
    let seq = 0;
    return store.onAuth(async authUser => {
      const mine = ++seq;
      if (!authUser) { setUser(null); return; }
      // El perfil (nombre e imagen elegidos por el usuario) tiene prioridad sobre los datos de Google.
      let profile = null;
      try { profile = await store.getProfile(authUser.uid); } catch { /* sin perfil: datos de Google */ }
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
      });
    });
  }, [store]);

  const updateUser = useCallback((patch: Partial<Pick<User, "name" | "photo" | "thumb">>) => {
    setUser(u => (u ? { ...u, ...patch } : u));
  }, []);

  let content;
  if (bootError) content = <div className="boot"><div className="empty-box error">No se pudo cargar la aplicación: {bootError}</div></div>;
  else if (!store || user === undefined) content = <div className="boot">Cargando…</div>;
  else if (!user) content = <Gate store={store} demo={DEMO} />;
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
      {content}
    </>
  );
}
