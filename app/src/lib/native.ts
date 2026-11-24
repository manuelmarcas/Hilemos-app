// La app de Android (Capacitor) carga esta misma web dentro de un WebView. Aquí está lo que cambia allí.
// En el navegador, isNative() es false y los plugins no se descargan (todos van con import dinámico).
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

/** Dirección pública de la web. Dentro de la app la página se sirve desde https://localhost, que no vale para compartir. */
export const PUBLIC_ORIGIN = "https://hilemos.web.app";
export const publicHost = () => (isNative() ? new URL(PUBLIC_ORIGIN).host : location.host);

/** ¿Hay menú de compartir del sistema? El WebView de Android no tiene navigator.share: en la app va por el plugin. */
export const canShareLink = () => isNative() || typeof navigator.share === "function";

/** Abre el menú de compartir del sistema. Si la persona lo cierra sin compartir, no pasa nada. */
export async function shareLink(data: { title: string; text: string; url?: string }) {
  // Sin enlace (p. ej. la clave de acceso) se comparte solo el texto.
  if (!data.url) data = { title: data.title, text: data.text };
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ ...data, dialogTitle: "Compartir" });
    } else await navigator.share(data);
  } catch { /* cancelado */ }
}

/**
 * Comparte un archivo (QR, tarjeta del resultado) con el menú del sistema. Solo en la app, donde las descargas
 * del navegador no funcionan: lo guarda en la caché y comparte esa copia. Devuelve false fuera de la app.
 */
export async function shareFileNative(blob: Blob, name: string, title: string, text?: string): Promise<boolean> {
  if (!isNative()) return false;
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
  try { await Share.share({ title, text, files: [uri], dialogTitle: "Compartir" }); } catch { /* cancelado */ }
  return true;
}

const toBase64 = (b: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = () => reject(r.error);
  r.readAsDataURL(b);
});

/** Ficha de Hilemos en Google Play (para actualizar la app). */
export const PLAY_URL = "https://play.google.com/store/apps/details?id=app.hilemos";

/** Versión (versionCode) de la app de Android; null en la web o si no se puede saber. */
export async function nativeBuild(): Promise<number | null> {
  if (!isNative()) return null;
  try {
    const { App } = await import("@capacitor/app");
    const n = Number((await App.getInfo()).build);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

export function initNative() {
  if (!isNative()) return;
  void import("@capacitor/app").then(({ App }) => {
    // Enlace de una votación abierto desde fuera (WhatsApp, correo…) con la app instalada: se va a su ruta (#/v/<id>).
    void App.addListener("appUrlOpen", ({ url }) => {
      // Enlace de entrada por correo: lo completa App (EmailLinkFinish).
      if (/[?&]oobCode=/.test(url)) { window.dispatchEvent(new CustomEvent("hilemos-email-link", { detail: url })); return; }
      const { hash } = new URL(url);
      if (hash.startsWith("#/")) location.hash = hash;
    });
    // Botón Atrás de Android: primero cierra el diálogo abierto, luego vuelve atrás y, en la primera pantalla, sale.
    void App.addListener("backButton", ({ canGoBack }) => {
      const dlg = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].pop();
      if (dlg) dlg.close();
      else if (canGoBack) history.back();
      else void App.exitApp();
    });
  });
}
