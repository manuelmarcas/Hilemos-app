// Tener Hilemos como app: en Android, desde Google Play (cuando esté publicada) o instalando la web desde Chrome; en
// iPhone, añadiendo la web a la pantalla de inicio desde Safari (no hay app de la App Store). Lo ofrece InstallDialog.
import { isNative } from "./native";
import { isStandalone } from "./push";
import { isAndroid, isIos } from "./util";

/** Ficha de Google Play. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.hilemos";
/** Ya está publicada en Google Play. Hasta entonces, en Android se ofrece instalar la web desde el navegador. */
export const PLAY_PUBLISHED = false;

/** Al cerrar la ventana con «Ahora no», no se vuelve a ofrecer sola en estos días. */
const SNOOZE_DAYS = 30;
const SNOOZE_KEY = "hilemos-install-snooze";

export type InstallPlatform = "android" | "ios" | "desktop";
export const installPlatform = (): InstallPlatform => (isIos() ? "ios" : isAndroid() ? "android" : "desktop");

/** Tiene sentido ofrecerla: es la web en un navegador, no la app ni la web ya instalada. */
export const canOfferInstall = () => !isNative() && !isStandalone();

/** Se ofrece sola al entrar: en un móvil, en el navegador y si no se dijo «Ahora no» hace poco. */
export function shouldAutoOfferInstall() {
  if (!canOfferInstall() || installPlatform() === "desktop") return false;
  try { return Date.now() > Number(localStorage.getItem(SNOOZE_KEY) || 0); } catch { return false; }
}

export function snoozeInstall() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch { /* sin almacenamiento */ }
}

// Chrome (Android y ordenador) avisa de que la web se puede instalar con «beforeinstallprompt»: se guarda para
// ofrecer un botón «Instalar» propio en vez del menú del navegador. Safari no lo tiene.
interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e as InstallPromptEvent; });
  window.addEventListener("appinstalled", () => { deferred = null; });
}

/** El navegador deja instalarla con un botón propio. */
export const canPromptInstall = () => !!deferred;

/** Abre el diálogo de instalación del navegador; true si se ha instalado. */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  return (await e.userChoice).outcome === "accepted";
}

/** Abre la ventana «Hilemos en tu móvil» (la pinta InstallHost, en Shell). */
export const openInstall = () => window.dispatchEvent(new Event("hilemos-install"));
