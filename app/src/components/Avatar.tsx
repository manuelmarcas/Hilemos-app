import type { CSSProperties } from "react";
import { cls, firstGrapheme, hue, safePhoto } from "../lib/util";

// Foto de perfil o, si no hay, un círculo con la inicial. `className`: mezcla BEM del bloque que lo contiene
// (p. ej. «avatar-stack__item»).
export function Avatar({ name, photo, size = 30, seed = "", className }: {
  name: string; photo?: string; size?: number; seed?: string; className?: string;
}) {
  const src = safePhoto(photo);
  if (src) {
    return <img className={cls("avatar", className)} src={src} alt="" style={{ "--s": `${size}px` } as CSSProperties} referrerPolicy="no-referrer" loading="lazy" />;
  }
  const initial = (firstGrapheme(name || "?") || "?").toUpperCase();
  return (
    <span className={cls("avatar avatar--initial", className)} style={{ "--s": `${size}px`, "--h": hue(seed || name) } as CSSProperties} aria-hidden="true">
      {initial}
    </span>
  );
}
