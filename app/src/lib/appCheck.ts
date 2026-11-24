// App Check (docs/funcionalidades-y-planes.md, 7.4, paso 2): cada petición a Firebase lleva un justificante de que
// viene de la app de verdad, no de un script. Mientras en la consola de Firebase no se «exija», los que llegan sin
// justificante siguen funcionando: solo se cuentan (el modo «solo medir»). Al exigirlo, se rechazan.
//  - Android: Play Integrity (Google Play confirma que es la app de la tienda en un móvil de verdad), con el plugin
//    nativo. Firestore va por el SDK web dentro del WebView, así que recibe el justificante con un CustomProvider.
//  - Web: reCAPTCHA Enterprise, invisible. Solo si hay clave (`appCheckSiteKey` en config.ts); sin ella, no se activa.
// Para un móvil o navegador sin verificar (versión de depuración, localhost): con `hilemos-appcheck-debug` = "1" en el
// localStorage se usa el proveedor de depuración; su token sale en logcat o en la consola y se da de alta en la consola
// de Firebase (App Check → Gestionar tokens de depuración). En localhost se usa siempre.
import type { FirebaseApp } from "firebase/app";
import { appCheckSiteKey } from "./config";
import { isNative } from "./native";

const DEBUG_KEY = "hilemos-appcheck-debug";
const debugOn = () => { try { return localStorage.getItem(DEBUG_KEY) === "1"; } catch { return false; } };

/** Activa App Check antes de usar Firestore. Si falla, la app sigue (sin justificante, como antes de activarlo). */
export async function initAppCheck(app: FirebaseApp) {
  if (!isNative() && !appCheckSiteKey) return; // web sin clave: ni se descarga
  try {
    const { initializeAppCheck, CustomProvider, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
    if (isNative()) {
      const { FirebaseAppCheck } = await import("@capacitor-firebase/app-check");
      await FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true, debugToken: debugOn() });
      initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => {
            const { token, expireTimeMillis } = await FirebaseAppCheck.getToken();
            // Sin caducidad, se pide otro a la media hora (los de Play Integrity duran 1 hora).
            return { token, expireTimeMillis: expireTimeMillis ?? Date.now() + 30 * 60000 };
          },
        }),
        isTokenAutoRefreshEnabled: true,
      });
      return;
    }
    if (debugOn() || location.hostname === "localhost") {
      (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  } catch (e) {
    console.warn("No se ha podido activar App Check", e);
  }
}
