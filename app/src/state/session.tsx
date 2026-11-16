// Sesión: almacén de datos, usuario, su colección (votaciones y grupos) y preferencias de navegación.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Library, Store, User } from "../lib/types";

export interface LibraryState {
  data: Library | null;
  error: unknown;
}

interface SessionApi {
  store: Store;
  demo: boolean;
  user: User;
  /** Cambia nombre/foto del usuario tras guardar el perfil. */
  updateUser: (patch: Partial<Pick<User, "name" | "photo">>) => void;
  library: LibraryState;
  /** Último grupo elegido (para preseleccionarlo al crear una votación). */
  lastGroup: string;
  setLastGroup: (g: string) => void;
  /** Filtro de grupos de "Mis votaciones" ("all" | "none" | id de grupo). */
  homeFilter: string;
  setHomeFilter: (f: string) => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession fuera de SessionProvider");
  return s;
}

// Solo se monta con un usuario con sesión: al cambiar de usuario se vuelve a montar (key = uid).
export function SessionProvider({ store, demo, user, updateUser, children }: {
  store: Store;
  demo: boolean;
  user: User;
  updateUser: SessionApi["updateUser"];
  children: ReactNode;
}) {
  const [library, setLibrary] = useState<LibraryState>({ data: null, error: null });
  const [lastGroup, setLastGroup] = useState("");
  const [homeFilter, setHomeFilter] = useState("all");

  // Una única suscripción a la colección, compartida por el menú lateral y las pantallas.
  useEffect(() => store.watchLibrary(user.uid,
    data => setLibrary({ data, error: null }),
    error => setLibrary(l => ({ ...l, error }))), [store, user.uid]);

  const api = useMemo(() => ({ store, demo, user, updateUser, library, lastGroup, setLastGroup, homeFilter, setHomeFilter }),
    [store, demo, user, updateUser, library, lastGroup, homeFilter]);

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}
