// Estructura de la app con sesión: barra superior, menú lateral y pantalla actual.
import { useEffect, useState } from "react";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { parseRoute, useHashPath } from "../state/route";
import { offerPushOnce, onPushMessage, pushActiveHere } from "../lib/push";
import { Avatar } from "./Avatar";
import { LogoMark } from "./LogoMark";
import { Icon } from "./Icon";
import { AccessKeyDialog } from "./AccessKeyDialog";
import { NameDialog } from "./NameDialog";
import { Sidebar } from "./Sidebar";
import { Home } from "../pages/Home";
import { Create } from "../pages/Create";
import { PollPage } from "../pages/poll/PollPage";
import { EditPoll } from "../pages/poll/EditPoll";
import { Profile } from "../pages/Profile";
import { Legal } from "../pages/Legal";

export function Shell() {
  const { store, user } = useSession();
  const { toast, confirm } = useUi();

  // Sin cuenta, para volver a entrar hace falta la clave de acceso: se recuerda antes de salir.
  const logout = async () => {
    if (user.anon && store.mode === "firebase" && !(await confirm({
      title: "¿Salir de tu cuenta sin registro?",
      message: "Para volver a entrar como «" + user.name + "» necesitarás tu clave de acceso (en «Entrar con tu clave»). Si no la tienes guardada, crea una nueva en «Tu perfil» antes de salir: sin ella perderás tus votaciones y no podrás cambiar tus votos.",
      confirmLabel: "Salir",
      danger: true,
    }))) return;
    store.signOut();
  };
  const path = useHashPath();
  const route = parseRoute(path);
  const [drawer, setDrawer] = useState(false);
  // La barra superior se queda pegada en el móvil; en cuanto hay algo debajo, se le pone sombra.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // En la app de Android, la primera vez que se entra se piden los avisos (una sola vez por dispositivo).
  useEffect(() => { void offerPushOnce(store, user.uid); }, [store, user.uid]);

  // Con la app abierta el navegador no pinta el aviso: se muestra como aviso flotante.
  useEffect(() => {
    if (store.mode !== "firebase" || !pushActiveHere()) return;
    let off: (() => void) | undefined, alive = true;
    onPushMessage(toast).then(u => { if (alive) off = u; else u(); }).catch(() => { /* sin avisos en este navegador */ });
    return () => { alive = false; off?.(); };
  }, [store, toast]);

  // El menú lateral se muestra dentro de una votación y al crear o editar una.
  const withSidebar = route.name === "create" || route.name === "poll" || route.name === "edit";

  useEffect(() => {
    if (route.name === "unknown") location.replace("#/");
  }, [route.name]);

  // Al cambiar de pantalla: cerrar el cajón y volver arriba.
  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    document.body.classList.toggle("page--with-sidebar", withSidebar);
    return () => document.body.classList.remove("page--with-sidebar");
  }, [withSidebar]);

  // En móvil el menú lateral es un cajón que se abre con ☰.
  useEffect(() => {
    document.body.classList.toggle("page--drawer-open", drawer);
    // Al abrirse, el cajón aún está oculto (visibility:hidden) y no admite el foco: se lo da en el siguiente fotograma.
    const raf = drawer ? requestAnimationFrame(() => document.querySelector<HTMLElement>("#sidebar .sidebar__new")?.focus()) : 0;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && drawer) setDrawer(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("page--drawer-open"); cancelAnimationFrame(raf); };
  }, [drawer]);

  let page = null;
  switch (route.name) {
    case "home": page = <Home />; break;
    case "create": page = <Create />; break;
    case "profile": page = <Profile />; break;
    case "poll": page = <PollPage key={route.id} id={route.id} />; break;
    case "edit": page = <EditPoll key={route.id} id={route.id} />; break;
    case "legal": page = <Legal doc={route.doc} />; break;
  }

  return (
    <div id="app" className="app">
      <header className={"topbar" + (scrolled ? " topbar--scrolled" : "")}>
        <div className="topbar__left">
          <button className="topbar__drawer" id="sb-toggle" aria-label="Abrir mis votaciones" aria-controls="sidebar"
            aria-expanded={drawer} onClick={() => setDrawer(d => !d)}><Icon name="menu" /></button>
          <a className="brand" href="#/" aria-label="Hilemos: mis votaciones">
            <LogoMark className="brand__logo" />
            <span className="brand__name" aria-hidden="true"><span className="wordmark__hile">Hile</span><span className="wordmark__mos">mos</span></span>
          </a>
        </div>
        <div className="topbar__who">
          <a className="topbar__me" href="#/perfil" data-tip="Tu perfil" aria-label={`Tu perfil: ${user.name}`}>
            <span id="me-avatar" className="topbar__avatar"><Avatar name={user.name} photo={user.photo} size={30} seed={user.uid} /></span>
            <span id="who-name" className="topbar__name">{user.name}</span>
          </a>
          <button className="topbar__logout" onClick={logout}>Salir</button>
        </div>
      </header>
      <div className="app__layout">
        <Sidebar activeId={route.name === "poll" || route.name === "edit" ? route.id : null} onNavigate={() => setDrawer(false)} />
        <main id="view" className="app__view" key={path}>{page}</main>
      </div>
      <div className="sidebar-backdrop" id="sb-backdrop" onClick={() => setDrawer(false)} />
      <AccessKeyDialog />
      <NameDialog />
    </div>
  );
}
