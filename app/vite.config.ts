import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": rutas relativas, para que funcione igual en GitHub Pages (subcarpeta) y dentro de Capacitor.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // Firestore ocupa ~580 KB, pero solo se descarga fuera del modo demo (import dinámico).
  build: { outDir: "dist", sourcemap: true, chunkSizeWarningLimit: 700 },
});
