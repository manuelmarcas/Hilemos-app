// Contador de caracteres de un campo con máximo: solo aparece al acercarse al límite (desde el 80 %), para que se
// entienda por qué no deja escribir más sin llenar de números los campos que casi nunca llegan.
import { bem } from "../lib/util";

export function CharCount({ value, max, className }: { value: string; max: number; className?: string }) {
  if (value.length < max * 0.8) return null;
  return (
    <span className={bem("char-count", { full: value.length >= max }, className)} aria-live="polite">
      {value.length}/{max}
    </span>
  );
}
