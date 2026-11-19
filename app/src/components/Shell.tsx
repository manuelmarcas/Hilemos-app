// Estructura de la app con sesión: barra superior, menú lateral y pantalla actual.
import { useEffect, useState } from "react";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { parseRoute, useHashPath } from "../state/route";
import { onPushMessage } from "../lib/push";
import { Avatar } from "./Avatar";
import { LogoMark } from "./LogoMark";
import { Sidebar } from "./Sidebar";
import { Home } from "../pages/Home";
import { Create } from "../pages/Create";
import { PollPage } from "../pages/Poll";
import { Profile } from "../pages/Profile";

export function Shell() {
  const { store, user } = useSession();
  const { toast } = useUi();
  const path = useHashPath();
  const route = parseRoute(path);
  const [drawer, setDrawer] = useState(false);

  // Con la app abierta el navegador no pinta el aviso: se muestra como aviso flotante.
  useEffect(() => {
    if (store.mode !== "firebase" || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let off: (() => void) | undefined, alive = true;
    onPushMessage(toast).then(u => { if (alive) off = u; else u(); }).catch(() => { /* sin avisos en este navegador */ });
    return () => { alive = false; off?.(); };
  }, [store, toast]);

  // El menú lateral se muestra dentro de una votación y al crear una.
  const withSidebar = route.name === "create" || route.name === "poll";

  useEffect(() => {
    if (route.name === "unknown") location.replace("#/");
  }, [route.name]);

  // Al cambiar de pantalla: cerrar el cajón y volver arriba.
  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    document.body.classList.toggle("with-sidebar", withSidebar);
    return () => document.body.classList.remove("with-sidebar");
  }, [withSidebar]);

  // En móvil el menú lateral es un cajón que se abre con ☰.
  useEffect(() => {
    document.body.classList.toggle("sb-open", drawer);
    if (drawer) document.querySelector<HTMLElement>("#sidebar .sb-new")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && drawer) setDrawer(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("sb-open"); };
  }, [drawer]);

  let page = null;
  switch (route.name) {
    case "home": page = <Home />; break;
    case "create": page = <Create />; break;
    case "profile": page = <Profile />; break;
    case "poll": page = <PollPage key={route.id} id={route.id} />; break;
  }

  return (
    <div id="app">
      <header className="topbar">
        <div className="topbar-left">
          <button className="sb-toggle" id="sb-toggle" aria-label="Abrir mis votaciones" aria-controls="sidebar"
            aria-expanded={drawer} onClick={() => setDrawer(d => !d)}>☰</button>
          <a className="brand" href="#/" aria-label="Hilemos: mis votaciones">
            <LogoMark className="brand-logo" />
            <span className="brand-name" aria-hidden="true"><span className="brand-accent">hil</span>emos</span>
          </a>
        </div>
        <div className="who">
          <a className="me" href="#/perfil" title="Tu perfil">
            <span id="me-avatar" className="me-avatar"><Avatar name={user.name} photo={user.photo} size={30} seed={user.uid} /></span>
            <span id="who-name">{user.name}</span>
          </a>
          <button className="logout-btn" id="logout" onClick={() => store.signOut()}>Salir</button>
        </div>
      </header>
      <div className="layout">
        <Sidebar activeId={route.name === "poll" ? route.id : null} onNavigate={() => setDrawer(false)} />
        <main id="view" key={path}>{page}</main>
      </div>
      <div className="sb-backdrop" id="sb-backdrop" onClick={() => setDrawer(false)} />
    </div>
  );
}
