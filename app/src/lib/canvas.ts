// Ayudas para dibujar en un canvas lo que se comparte o se exporta (imagen del resultado e informe en PDF):
// fuentes, colores del design system y texto que se recorta o se reparte en líneas.
import tokens from "../../design-system/tokens.json";

export const DISPLAY = '"Bricolage Grotesque", system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
export const SANS = 'Figtree, system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';

// Colores que se usan al dibujar.
const USED = ["bg", "card", "soft", "line", "ink", "muted", "brand", "brand-strong", "best", "best-soft", "on-best", "tie-soft", "tie-ink"];

/** Los colores del tema claro de tokens.json, como `{"--ink": "#2a1f27", …}`: para lo que se imprime. */
export const LIGHT: Record<string, string> = Object.fromEntries(USED.map(n => {
  const t = tokens.color.tokens.find(x => x.name === n);
  return [`--${n}`, typeof t?.value === "object" ? t.value.light : String(t?.value ?? "")];
}));

/** Los colores del tema que se ve ahora (claro u oscuro); si la hoja de estilos no está, los del claro. */
export function currentColors() {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(Object.keys(LIGHT).map(k => [k, cs.getPropertyValue(k).trim() || LIGHT[k]]));
}

/** Espera a las fuentes de la app; false si la de los títulos no está (se dibuja entonces con la normal). */
export async function fontsReady() {
  try {
    await document.fonts.ready;
    return document.fonts.check(`800 68px "Bricolage Grotesque"`);
  } catch {
    return false;
  }
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** El texto recortado con «…» para que quepa en `maxWidth`. */
export function clamp(g: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (g.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s && g.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1).trimEnd();
  return `${s}…`;
}

/** El texto repartido en líneas de `maxWidth` como mucho; si no cabe en `maxLines`, la última acaba en «…». */
export function lines(g: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  let left = 0;
  for (const [i, w] of words.entries()) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    out.push(line);
    line = w;
    if (out.length === maxLines) { left = words.length - i; break; }
  }
  if (out.length < maxLines && line) out.push(line);
  const last = out.length - 1;
  return out.map((l, i) => clamp(g, i === last && left > 0 ? `${l}…` : l, maxWidth));
}
