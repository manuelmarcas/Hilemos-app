// Avisos (Firebase Cloud Messaging): permiso, token del dispositivo y mensajes con la app abierta.
// - En el navegador: service worker (public/firebase-messaging-sw.js, que pinta el aviso en segundo plano) y SDK web.
// - En la app de Android: el plugin @capacitor/push-notifications (el WebView no tiene avisos web). El aviso lo pinta
//   Android con el icono y el canal «avisos» del AndroidManifest.xml.
// Los avisos solo se ofrecen cuando está todo listo: plan Blaze, Cloud Functions desplegadas y la clave VAPID en
// config.ts (sin ella, «unconfigured» en los dos sitios). Ver «Avisos» en app/README.md.
import type { PluginListenerHandle } from "@capacitor/core";
import { fcmVapidKey } from "./config";
import { isNative } from "./native";
import type { Store } from "./types";
import { isIos } from "./util";

const SW_URL = "/firebase-messaging-sw.js";
// El token del dispositivo se recuerda aquí para poder borrarlo al desactivar los avisos.
const TOKEN_KEY = "votaciones-push-token";
/** Canal de Android de los avisos (el mismo que usan las Cloud Functions y el AndroidManifest.xml). */
const CHANNEL = "avisos";

export type PushState =
  | "unsupported"   // el navegador no puede (o es iPhone sin añadir a la pantalla de inicio)
  | "unconfigured"  // los avisos aún no están activados en el servidor (falta la clave VAPID en config.ts)
  | "denied"        // la persona los ha bloqueado en el navegador o en los ajustes del móvil
  | "off"
  | "on";

const savedToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const saveToken = (t: string | null) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* sin localStorage */ }
};

// En iPhone y iPad los avisos solo existen si la web está añadida a la pantalla de inicio (ver isIos en util.ts).
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches
  || (navigator as { standalone?: boolean }).standalone === true;

async function messaging() {
  const M = await import("firebase/messaging");
  if (!(await M.isSupported())) return null;
  const { getApp } = await import("firebase/app");
  return { M, instance: M.getMessaging(getApp()) };
}

const nativePush = async () => (await import("@capacitor/push-notifications")).PushNotifications;

/** Qué se le puede ofrecer a esta persona en este dispositivo. */
export async function pushState(store: Store): Promise<PushState> {
  if (store.mode !== "firebase") return "unsupported";
  if (isNative()) {
    if (!fcmVapidKey) return "unconfigured";
    try {
      const { receive } = await (await nativePush()).checkPermissions();
      if (receive === "denied") return "denied";
      return receive === "granted" && savedToken() ? "on" : "off";
    } catch {
      return "unsupported"; // una versión de la app sin el plugin
    }
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) return "unsupported";
  if (isIos() && !isStandalone()) return "unsupported";
  if (!(await messaging())) return "unsupported";
  if (!fcmVapidKey) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && savedToken() ? "on" : "off";
}

/** Token de Android: se pide el registro y llega por un evento (o un error). */
async function nativeToken(): Promise<string> {
  const P = await nativePush();
  // Android 8+: los avisos van a un canal; con nombre propio se pueden ajustar en los ajustes del móvil.
  await P.createChannel({ id: CHANNEL, name: "Avisos de las votaciones", importance: 4, visibility: 1 }).catch(() => {});
  return new Promise<string>((resolve, reject) => {
    const handles: Promise<PluginListenerHandle>[] = [];
    const finish = () => { clearTimeout(timer); handles.forEach(h => h.then(x => x.remove()).catch(() => {})); };
    const timer = setTimeout(() => { finish(); reject(new Error("El móvil no ha respondido. Inténtalo de nuevo.")); }, 20000);
    handles.push(P.addListener("registration", t => { finish(); resolve(t.value); }));
    handles.push(P.addListener("registrationError", e => { finish(); reject(new Error(e.error)); }));
    P.register().catch(e => { finish(); reject(e); });
  });
}

/** Pide permiso y guarda el token del dispositivo. Devuelve false si no dieron permiso. */
export async function enablePush(store: Store, uid: string): Promise<boolean> {
  if (!fcmVapidKey) return false;
  let token: string;
  if (isNative()) {
    const P = await nativePush();
    let { receive } = await P.checkPermissions();
    if (receive !== "granted" && receive !== "denied") receive = (await P.requestPermissions()).receive;
    if (receive !== "granted") return false;
    token = await nativeToken();
    await store.savePushToken(uid, token, { platform: "android", updatedAt: Date.now() });
  } else {
    const m = await messaging();
    if (!m) return false;
    if ((await Notification.requestPermission()) !== "granted") return false;
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    token = await m.M.getToken(m.instance, { vapidKey: fcmVapidKey, serviceWorkerRegistration: registration });
    if (!token) return false;
    await store.savePushToken(uid, token, { platform: navigator.userAgent.slice(0, 120), updatedAt: Date.now() });
  }
  saveToken(token); // si no se puede recordar, se podrá volver a activar
  return true;
}

export async function disablePush(store: Store, uid: string) {
  const token = savedToken();
  saveToken(null);
  if (token) await store.removePushToken(uid, token).catch(() => { /* ya no estaba */ });
  if (isNative()) {
    await (await nativePush()).unregister().catch(() => { /* ya no estaba registrado */ });
    return;
  }
  const m = await messaging();
  if (m) await m.M.deleteToken(m.instance).catch(() => { /* el token ya no valía */ });
}

/** Si en este dispositivo llegan avisos (para mostrar los que llegan con la app abierta). */
export function pushActiveHere() {
  if (isNative()) return !!savedToken();
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

/** Avisos que llegan con la app abierta: ni el navegador ni Android los pintan, así que van al aviso flotante. */
export async function onPushMessage(cb: (text: string) => void): Promise<() => void> {
  if (isNative()) {
    const h = await (await nativePush()).addListener("pushNotificationReceived", n => {
      const text = [n.title || n.data?.title, n.body || n.data?.body].filter(Boolean).join(": ");
      if (text) cb(text);
    });
    return () => { void h.remove(); };
  }
  const m = await messaging();
  if (!m) return () => { /* nada que soltar */ };
  return m.M.onMessage(m.instance, payload => {
    const d = payload.data || {};
    const text = [d.title, d.body].filter(Boolean).join(": ");
    if (text) cb(text);
  });
}

/** App de Android: al pulsar un aviso, abre su votación (la dirección viene en data.url: …/#/v/<id>). */
export async function initNativePushTaps() {
  try {
    await (await nativePush()).addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = notification.data?.url;
      if (typeof url !== "string") return;
      const { hash } = new URL(url, location.href);
      if (hash.startsWith("#/")) location.hash = hash;
    });
  } catch { /* versión de la app sin el plugin */ }
}
