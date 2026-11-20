import type { CapacitorConfig } from "@capacitor/cli";

// App de Android: empaqueta la web compilada (dist) en un WebView. Ver «App de Android» en README.md.
const config: CapacitorConfig = {
  // Identificador en Google Play: no se puede cambiar una vez publicada la app.
  appId: "app.hilemos",
  appName: "Hilemos",
  webDir: "dist",
  plugins: {
    // El login con Google se hace con la cuenta del móvil (nativo) y la sesión la lleva el SDK web de Firebase,
    // igual que en la web: skipNativeAuth devuelve el token de Google sin iniciar sesión en el Firebase nativo.
    FirebaseAuthentication: { skipNativeAuth: true, providers: ["google.com"] },
    SplashScreen: { launchShowDuration: 0 },
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover" },
  },
};

export default config;
