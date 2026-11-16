// Perfiles públicos (nombre visible e imagen) de otras personas.
// El nombre no se guarda por votación: cada pantalla muestra el que tenga cada usuario en su perfil.
// Cada pantalla los pide al abrirse (así se ve el nombre actual); dentro de la pantalla no se repiten lecturas.
import { useEffect, useRef, useState } from "react";
import type { Profile, Store, User, Vote, Votes } from "../lib/types";
import { useSession } from "./session";

const cache = new Map<string, { at: number; p: Promise<Profile | null> }>();

// Reutiliza la lectura si se hizo después de `since` (al abrir la pantalla).
function loadProfile(store: Store, uid: string, since: number) {
  const hit = cache.get(uid);
  if (hit && hit.at >= since) return hit.p;
  const p = store.getProfile(uid).catch(() => null); // sin permiso o sin perfil: se usa lo guardado en el voto
  cache.set(uid, { at: Date.now(), p });
  return p;
}

export const forgetProfile = (uid: string) => { cache.delete(uid); };

/** Perfiles de `uids` (null si no tiene o no se pudo leer). Los que aún cargan no aparecen. */
export function useProfiles(uids: string[]): Record<string, Profile | null> {
  const { store } = useSession();
  const [profiles, setProfiles] = useState<Record<string, Profile | null>>({});
  const since = useRef(Date.now()).current;
  const key = [...new Set(uids)].sort().join(",");

  useEffect(() => {
    if (!key) return;
    let alive = true;
    key.split(",").forEach(uid => {
      loadProfile(store, uid, since).then(p => {
        if (alive) setProfiles(prev => (prev[uid] === p ? prev : { ...prev, [uid]: p }));
      });
    });
    return () => { alive = false; };
  }, [store, key, since]);

  return profiles;
}

/** Nombre visible de un usuario: el suyo si es el actual, el de su perfil o, si no hay, `fallback`. */
export function profileName(uid: string, profiles: Record<string, Profile | null>, me: User, fallback = "") {
  if (uid === me.uid) return me.name;
  return profiles[uid]?.name || fallback;
}

/** Votos con el nombre y la imagen actuales de cada participante (en lugar de los copiados en el voto). */
export function withProfiles(votes: Votes, profiles: Record<string, Profile | null>, me: User): Votes {
  const out: Votes = {};
  for (const uid in votes) {
    const v: Vote = votes[uid] || {};
    if (uid === me.uid) { out[uid] = { ...v, name: me.name, photo: me.photo }; continue; }
    const p = profiles[uid];
    out[uid] = p
      ? { ...v, name: p.name || v.name, photo: typeof p.photo === "string" ? p.photo : v.photo }
      : v;
  }
  return out;
}
