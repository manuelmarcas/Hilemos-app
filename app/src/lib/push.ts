// Avisos (Firebase Cloud Messaging) en el navegador: permiso, token del dispositivo y mensajes en primer plano.
// El aviso en segundo plano lo pinta public/firebase-messaging-sw.js.
import { fcmVapidKey } from "./config";
import type { Store } from "./types";

const SW_URL = "/firebase-messaging-sw.js";

export type PushState =
  | "unsupported"   // el navegador no puede (o es iPhone sin añadir a la pantalla de inicio)
  | "unconfigured"  // falta la clave VAPID en config.ts
  | "denied"        // la persona los ha bloqueado en el navegador
  | "off"
  | "on";

/** En iPhone y iPad los avisos solo existen si la web está añadida a la pantalla de inicio. */
export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches
  || (navigator as { standalone?: boolean }).standalone === true;

async function messaging() {
  const M = await import("firebase/messaging");
  if (!(await M.isSupported())) return null;
  const { getApp } = await import("firebase/app");
  return { M, instance: M.getMessaging(getApp()) };
}

/** Qué se le puede ofrecer a esta persona en este dispositivo. */
export async function pushState(store: Store): Promise<PushState> {
  if (store.mode !== "firebase") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) return "unsupported";
  if (isIos() && !isStandalone()) return "unsupported";
  if (!(await messaging())) return "unsupported";
  if (!fcmVapidKey) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && localStorage.getItem(tokenKey()) ? "on" : "off";
}

// El token del dispositivo se recuerda aquí para poder borrarlo al desactivar los avisos.
const tokenKey = () => "votaciones-push-token";

/** Pide permiso, registra el service worker y guarda el token. Devuelve false si no dieron permiso. */
export async function enablePush(store: Store, uid: string): Promise<boolean> {
  const m = await messaging();
  if (!m || !fcmVapidKey) return false;
  if ((await Notification.requestPermission()) !== "granted") return false;
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  const token = await m.M.getToken(m.instance, { vapidKey: fcmVapidKey, serviceWorkerRegistration: registration });
  if (!token) return false;
  await store.savePushToken(uid, token, { platform: navigator.userAgent.slice(0, 120), updatedAt: Date.now() });
  try { localStorage.setItem(tokenKey(), token); } catch { /* sin localStorage, se podrá volver a activar */ }
  return true;
}

export async function disablePush(store: Store, uid: string) {
  const token = localStorage.getItem(tokenKey());
  try { localStorage.removeItem(tokenKey()); } catch { /* nada */ }
  if (token) await store.removePushToken(uid, token).catch(() => { /* ya no estaba */ });
  const m = await messaging();
  if (m) await m.M.deleteToken(m.instance).catch(() => { /* el token ya no valía */ });
}

/** Avisos que llegan con la app abierta: el navegador no los pinta, así que los pasamos al aviso flotante. */
export async function onPushMessage(cb: (text: string) => void) {
  const m = await messaging();
  if (!m) return () => { /* nada que soltar */ };
  return m.M.onMessage(m.instance, payload => {
    const d = payload.data || {};
    const text = [d.title, d.body].filter(Boolean).join(": ");
    if (text) cb(text);
  });
}
