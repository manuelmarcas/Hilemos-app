// Señala los selectores del CSS (app/src/styles) que se saltan la convención BEM del proyecto:
//   - #id                     → estilos colgados de un id (van en clases)
//   - .bloque h2 / .x button  → etiqueta dentro de un bloque (mejor un elemento: .bloque__titulo)
//   - .a .b (bloques distintos) → un bloque que retoca el interior de otro (mejor una mezcla o una variable CSS)
//
//   node .claude/skills/limpieza-codigo/scripts/selectores-bem.mjs
//
// Excepciones admitidas (no salen): el reinicio de base.css (html, body, a, h1…), los estados de body
// (.page--…), texto con formato dentro de un bloque de prosa (strong, b, em, p, li, ul) y las tablas (th, td, tr).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../app/src/styles");
const PROSE = new Set(["strong", "b", "em", "p", "li", "ul", "ol", "th", "td", "tr", "thead", "tbody", "option", "svg"]);
const blockOf = c => c.replace(/^-/, "").split("__")[0].split("--")[0];
let total = 0;

for (const f of fs.readdirSync(DIR).filter(f => f.endsWith(".css") && f !== "index.css")) {
  const css = fs.readFileSync(path.join(DIR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  for (const raw of css.split("{").map(s => s.split("}").pop().split(";").pop())) {
    const sel = raw.trim();
    if (!sel || sel.startsWith("@") || /^(from|to|\d+%)$/.test(sel)) continue;
    for (const one of sel.split(",").map(s => s.trim())) {
      if (f === "base.css" && !one.includes(".")) continue;
      if (/^body\.page--/.test(one) || /^\.page--/.test(one)) continue;
      const why = [];
      if (/#[a-zA-Z]/.test(one.replace(/\[[^\]]*\]/g, ""))) why.push("id");
      const parts = one.replace(/\([^)]*\)/g, "").split(/\s*[\s>+~]\s*/).filter(Boolean);
      const blocks = parts.map(p => (p.match(/\.(-?[\w-]+)/) || [])[1]).filter(Boolean).map(blockOf);
      if (new Set(blocks).size > 1) why.push("otro bloque");
      parts.slice(1).forEach(p => {
        const tag = p.match(/^([a-z][a-z0-9-]*)/);
        if (tag && !PROSE.has(tag[1]) && parts[0].includes(".")) why.push(`etiqueta <${tag[1]}>`);
      });
      if (why.length) found.push(`  ${one}   ← ${why.join(", ")}`);
    }
  }
  if (found.length) { console.log(`${f}:`); found.forEach(l => console.log(l)); total += found.length; }
}
console.log(total ? `\n${total} selectores para revisar` : "Todo en BEM");
