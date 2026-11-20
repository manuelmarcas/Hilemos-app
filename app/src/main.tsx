import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { initTheme } from "./lib/theme";
import { initNative } from "./lib/native";
import { UiProvider } from "./state/ui";
import { App } from "./App";

initTheme();
initNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiProvider>
      <App />
    </UiProvider>
  </StrictMode>,
);
