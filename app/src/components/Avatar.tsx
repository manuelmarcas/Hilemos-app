import type { CSSProperties } from "react";
import { firstGrapheme, hue, safePhoto } from "../lib/util";

// Foto de perfil o, si no hay, un círculo con la inicial.
export function Avatar({ name, photo, size = 30, seed = "" }: { name: string; photo?: string; size?: number; seed?: string }) {
  const src = safePhoto(photo);
  if (src) {
    return <img className="av" src={src} alt="" style={{ "--s": `${size}px` } as CSSProperties} referrerPolicy="no-referrer" loading="lazy" />;
  }
  const initial = (firstGrapheme(name || "?") || "?").toUpperCase();
  return (
    <span className="av av-initial" style={{ "--s": `${size}px`, "--h": hue(seed || name) } as CSSProperties} aria-hidden="true">
      {initial}
    </span>
  );
}
