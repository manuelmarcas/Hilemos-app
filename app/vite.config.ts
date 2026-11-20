import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": rutas relativas, para que funcione igual en GitHub Pages (subcarpeta) y dentro de Capacitor.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react()],
  // Firestore ocupa ~580 KB, pero solo se descarga fuera del modo demo (import dinámico).
  // La app de Android (modo «android») no lleva los mapas de código: solo engordarían el paquete.
  build: { outDir: "dist", sourcemap: mode !== "android", chunkSizeWarningLimit: 700 },
}));
