/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { designTokens } from "./design-system/tokensPlugin";

// base "./": rutas relativas, para que funcione igual en GitHub Pages (subcarpeta) y dentro de Capacitor.
export default defineConfig(({ mode }) => ({
  base: "./",
  // designTokens: las variables CSS salen de design-system/tokens.json («virtual:tokens.css»).
  plugins: [designTokens(), react()],
  // Firestore ocupa ~580 KB, pero solo se descarga fuera del modo demo (import dinámico).
  // La app de Android (modo «android») no lleva los mapas de código: solo engordarían el paquete.
  build: { outDir: "dist", sourcemap: mode !== "android", chunkSizeWarningLimit: 700 },
  // Tests de la lógica pura (lib/): `npm test`. En Node, sin navegador; la zona horaria fija para que las fechas
  // salgan igual en cualquier máquina.
  test: { include: ["src/**/*.test.ts"], environment: "node", env: { TZ: "Europe/Madrid" } },
}));
