// Utilidades sin interfaz: mensajes de error, textos, imágenes y enlaces.
import type { Group } from "./types";
import { isNative, PUBLIC_ORIGIN } from "./native";

const ERRORS: Record<string, string> = {
  "permission-denied": "Permiso denegado. Si acabas de instalar la app, revisa que las reglas de Firestore (firestore.rules) estén publicadas.",
  "unavailable": "Sin conexión con el servidor. Comprueba tu conexión a internet.",
  "not-found": "La votación ya no existe.",
  "auth/popup-closed-by-user": "Has cerrado la ventana de Google antes de terminar.",
  "auth/popup-blocked": "El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase Authentication (Configuración > Dominios autorizados).",
  "auth/operation-not-allowed": "Entrar sin cuenta no está activado en Firebase (Authentication > Métodos de acceso > Anónimo).",
  "auth/admin-restricted-operation": "Entrar sin cuenta no está activado en Firebase (Authentication > Métodos de acceso > Anónimo).",
  "messaging/permission-blocked": "Has bloqueado los avisos en este navegador. Permítelos en los ajustes del sitio.",
  "messaging/unsupported-browser": "Este navegador no admite avisos.",
  "messaging/failed-service-worker-registration": "No se pudo preparar el navegador para recibir avisos.",
  "messaging/token-subscribe-failed": "No se pudo dar de alta este dispositivo para los avisos. Revisa la clave VAPID de config.ts.",
};

export const errMsg = (e: unknown) => {
  const err = e as { code?: string; message?: string } | null | undefined;
  return (err?.code && ERRORS[err.code]) || `Error: ${err?.code || err?.message || e}`;
};

// Primer grafema de un texto (para las iniciales de los avatares).
export function firstGrapheme(s: string | undefined) {
  s = (s || "").trim();
  if (!s) return "";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    for (const { segment } of new Intl.Segmenter("es", { granularity: "grapheme" }).segment(s)) return segment;
  }
  return [...s][0];
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copia este enlace:", text);
    return false;
  }
}

// Solo se aceptan imágenes en base64 o URLs https (la foto la escribe cada usuario).
export const safePhoto = (p: unknown) =>
  typeof p === "string" && (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p) || /^https:\/\/[^\s"'<>]+$/.test(p)) ? p : "";

export const hue = (s: string) => [...String(s || "?")].reduce((h, c) => (h * 31 + (c.codePointAt(0) || 0)) % 360, 7);

// Recorta una imagen al centro en cuadrado y la reduce (JPEG en base64, unos pocos KB).
export async function imageToAvatar(file: File, size = 128) {
  if (!file || !/^image\//.test(file.type)) throw new Error("El archivo no es una imagen.");
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await createImageBitmap(file);
  } catch {
    src = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = URL.createObjectURL(file);
    });
  }
  const w = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
  const h = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
  const side = Math.min(w, h);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, size, size);
  g.imageSmoothingQuality = "high";
  g.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  return c.toDataURL("image/jpeg", 0.85);
}

// Miniatura de la imagen de perfil para copiarla en los votos: si es una imagen en base64 se reduce
// (unos 2 KB); si es una URL de Google ya es ligera y se deja igual.
export async function makeThumb(photo: string | undefined, size = 64) {
  const src = safePhoto(photo);
  if (!src.startsWith("data:")) return src;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("No se pudo leer la imagen."));
    i.src = src;
  });
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, size, size);
  return c.toDataURL("image/jpeg", 0.8);
}

// Grupos del usuario ordenados por nombre: [{ id, name }].
export const sortedGroups = (groups: Record<string, Group> | null | undefined) => Object.entries(groups || {})
  .map(([id, g]) => ({ id, name: g.name || "Sin nombre" }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

// En la app (Capacitor) la página vive en https://localhost: los enlaces van a la web pública, que la app abre si está instalada.
export const pollUrl = (id: string) => isNative() ? `${PUBLIC_ORIGIN}/#/v/${id}`
  : `${location.origin}${location.pathname}${location.search}#/v/${id}`;

/** iPhone y iPad (el iPad moderno se presenta como un Mac, pero con pantalla táctil). */
export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isAndroid = () => /Android/i.test(navigator.userAgent);

export const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
