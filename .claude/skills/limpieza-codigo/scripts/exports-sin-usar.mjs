// Exportaciones de app/src que nadie importa ni usa fuera de su archivo (código muerto o que debería ser privado).
//
//   node .claude/skills/limpieza-codigo/scripts/exports-sin-usar.mjs
//
// TypeScript (noUnusedLocals) ya avisa de lo que no se usa dentro de un archivo, pero no de lo exportado. Aquí:
//   - «sin usar»: no se nombra en ningún otro archivo ni dentro del suyo → se puede borrar.
//   - «solo en su archivo»: se usa dentro, pero nadie lo importa → quitarle el export.
// Es por nombre (grep), así que un nombre muy común puede esconder un caso: confírmalo antes de borrar.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../app/src");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const files = walk(ROOT).filter(f => /\.tsx?$/.test(f) && !f.endsWith(".d.ts"));
const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, "utf8")]));
const rel = f => path.relative(ROOT, f).replace(/\\/g, "/");
// Puntos de entrada: lo que exportan no lo importa nadie de la app (lo carga Vite o el navegador).
const ENTRY = new Set(["main.tsx"]);

const unused = [], local = [];
for (const f of files) {
  if (ENTRY.has(rel(f))) continue;
  for (const m of src[f].matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[1];
    const re = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`, "g");
    const outside = files.some(g => g !== f && re.test(src[g]));
    if (outside) continue;
    const inside = (src[f].match(re) || []).length;
    (inside > 1 ? local : unused).push(`  ${name}  (${rel(f)})`);
  }
}
console.log(`Exportado y sin usar en ningún sitio (${unused.length}):`);
unused.forEach(l => console.log(l));
console.log(`\nExportado pero solo se usa en su propio archivo (${local.length}) — quitar el export:`);
local.forEach(l => console.log(l));
