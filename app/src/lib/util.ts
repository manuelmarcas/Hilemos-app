// Utilidades sin interfaz: mensajes de error, textos, imágenes y enlaces.
import type { Group } from "./types";
import { isNative, PUBLIC_ORIGIN } from "./native";

const ERRORS: Record<string, string> = {
  "permission-denied": "Permiso denegado. Si acabas de instalar la app, revisa que las reglas de Firestore (firestore.rules) estén publicadas.",
  "unavailable": "Sin conexión con el servidor. Comprueba tu conexión a internet.",
  "not-found": "La votación ya no existe.",
  "auth/popup-closed-by-user": "Has cerrado la ventana de Google antes de terminar.",
  "auth/account-exists-with-different-credential": "Ya tienes una cuenta de Hilemos con ese correo, creada con «Entrar con tu correo». Entra con esa opción: ahí están tus votaciones.",
  "auth/popup-blocked": "El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase Authentication (Configuración > Dominios autorizados).",
  "auth/operation-not-allowed": "Entrar sin cuenta no está activado en Firebase (Authentication > Métodos de acceso > Anónimo).",
  "auth/admin-restricted-operation": "Entrar sin cuenta no está activado en Firebase (Authentication > Métodos de acceso > Anónimo).",
  "key/format": "La clave tiene 20 letras y números, como 7KQ2-M9XF-4TBD-HR8P-W3NC.",
  "auth/invalid-credential": "Esa clave no es válida. Revisa que esté bien copiada; si creaste otra después, solo vale la última.",
  "auth/invalid-login-credentials": "Esa clave no es válida. Revisa que esté bien copiada; si creaste otra después, solo vale la última.",
  "auth/wrong-password": "Esa clave no es válida. Revisa que esté bien copiada; si creaste otra después, solo vale la última.",
  "auth/user-not-found": "Esa clave no es válida. Revisa que esté bien copiada; si creaste otra después, solo vale la última.",
  "auth/email-link-disabled": "Entrar con un enlace al correo no está activado en Firebase (Authentication › Método de acceso › Correo electrónico/contraseña › Vínculo de correo electrónico).",
  "auth/unauthorized-continue-uri": "Este dominio no está autorizado en Firebase Authentication (Configuración › Dominios autorizados).",
  "auth/invalid-action-code": "Este enlace ya se ha usado o ha caducado. Pide otro desde la pantalla de entrada.",
  "auth/expired-action-code": "Este enlace ha caducado. Pide otro desde la pantalla de entrada.",
  "auth/invalid-email": "Ese correo no es válido. Revisa que esté bien escrito.",
  "auth/email-already-in-use": "Ese correo ya tiene su propia cuenta en Hilemos. Sal y entra con él; esta cuenta sigue sin registro.",
  "auth/credential-already-in-use": "Ese correo ya tiene su propia cuenta en Hilemos. Sal y entra con él; esta cuenta sigue sin registro.",
  "auth/too-many-requests": "Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.",
  "auth/user-disabled": "Esta cuenta está desactivada.",
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
    // Sin portapapeles moderno (p. ej. sin HTTPS): el método clásico, sin ventanas del navegador.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    (document.querySelector("dialog[open]") || document.body).append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
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

/**
 * Clases BEM de un bloque o elemento con sus modificadores: bem("picker__day", { on: x, locked: y }) →
 * "picker__day picker__day--on" (solo los modificadores con valor verdadero). Un modificador con valor va con la
 * clave calculada: bem("cell__opt", { [`c${i}`]: true }). `mixes`: otras clases que lleva el mismo elemento (mezclas
 * BEM, como "btn create-bar__btn").
 */
export function bem(base: string, mods: Record<string, unknown> = {}, ...mixes: (string | false | null | undefined)[]) {
  return cls(base, ...Object.entries(mods).filter(([, on]) => on).map(([m]) => `${base}--${m}`), ...mixes);
}

/** Texto en minúsculas, sin tildes ni símbolos, para nombres de archivo e identificadores («Cena de Navidad» → «cena-de-navidad»). */
export const slugify = (s: string, max = 40) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max);
