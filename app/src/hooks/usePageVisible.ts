// Si la página está a la vista: false con la pestaña del navegador en segundo plano, el móvil bloqueado o la app de
// Android minimizada. Sirve para no dar por leído lo que llega mientras nadie mira.
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

/** true mientras la página se ve; cambia al pasar a segundo plano y al volver. */
export const usePageVisible = () => useSyncExternalStore(subscribe, () => document.visibilityState === "visible");
