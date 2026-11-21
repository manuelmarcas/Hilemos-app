import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "virtual:tokens.css"; // variables del design system (tokens.json)
import "./styles/index.css";
import { initTheme } from "./lib/theme";
import { initNative, isNative } from "./lib/native";
import { initNativePushTaps } from "./lib/push";
import { installFieldErrors } from "./lib/fieldErrors";
import { UiProvider } from "./state/ui";
import { App } from "./App";

initTheme();
initNative();
// App de Android: al pulsar un aviso, se abre su votación.
if (isNative()) void initNativePushTaps();
installFieldErrors(); // avisos de campos con el estilo de la app, no los del navegador

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiProvider>
      <App />
    </UiProvider>
  </StrictMode>,
);
