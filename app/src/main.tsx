import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "virtual:tokens.css"; // variables del design system (tokens.json)
import "./styles/index.css";
import { initTheme } from "./lib/theme";
import { initNative } from "./lib/native";
import { installFieldErrors } from "./lib/fieldErrors";
import { UiProvider } from "./state/ui";
import { App } from "./App";

initTheme();
initNative();
installFieldErrors(); // avisos de campos con el estilo de la app, no los del navegador

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiProvider>
      <App />
    </UiProvider>
  </StrictMode>,
);
