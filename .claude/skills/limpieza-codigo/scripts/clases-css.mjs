// Cruza las clases del CSS (app/src/styles) con las que usan los componentes (app/src, .tsx y .ts).
//
//   node .claude/skills/limpieza-codigo/scripts/clases-css.mjs            → informe
//   node .claude/skills/limpieza-codigo/scripts/clases-css.mjs --strict   → además, sale con código 1 si hay algo
//
// Informa de:
//   - Clases del CSS que ningún componente usa (candidatas a borrar).
//   - Clases que usan los componentes y no existen en el CSS (erratas o restos de un renombrado). Algunas son a
//     propósito: mezclas BEM sin estilo propio o ganchos para JS; revísalas, no las borres a ciegas.
//
// Entiende cls("a", x && "b"), bem("bloque", { mod: x }) (→ bloque--mod), condiciones dentro de plantillas
// (`btn ${x ? "btn--a" : ""}`) y clases dinámicas como `cell--n${n}` (toda clase del CSS que empiece por «cell--n»
// cuenta como usada). Lo que se construya de otra forma puede salir como falso aviso: compruébalo con grep antes de
// borrar nada.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../app/src");
const strict = process.argv.includes("--strict");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const files = walk(ROOT);
const rel = f => path.relative(ROOT, f).replace(/\\/g, "/");

// ---------- Clases definidas en el CSS ----------
const defined = new Map(); // clase → archivos
for (const f of files.filter(f => f.endsWith(".css"))) {
  const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "")
    .replace(/@import[^;]*;/g, "");
  // Solo los selectores (lo que va antes de cada «{»), no los valores (.5em, 1.2rem…).
  for (const sel of css.split("{").map(s => s.split("}").pop())) {
    for (const m of sel.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)) {
      if (!defined.has(m[1])) defined.set(m[1], new Set());
      defined.get(m[1]).add(rel(f));
    }
  }
}

// ---------- Clases que usan los componentes ----------
const used = new Map();     // clase → archivos
const prefixes = new Set(); // partes fijas de clases dinámicas: `cell--n${n}` → «cell--n»
const add = (c, f) => { if (!used.has(c)) used.set(c, new Set()); used.get(c).add(f); };
const TOKEN = /^-?[a-z_][\w-]*$/; // sin mayúscula inicial: así no cuentan «T» de `${d}T${h}` ni nombres propios

/** Lo que hay entre el delimitador de `i` («{» o «(») y su pareja. */
function balanced(src, i) {
  const open = src[i], close = open === "{" ? "}" : ")";
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close && --depth === 0) return src.slice(i + 1, j);
  }
  return "";
}

/** Literales de cadena de una expresión: [{ text, template }], con las plantillas enteras (aunque lleven ${…}). */
function literals(expr) {
  const out = [];
  for (let i = 0; i < expr.length; i++) {
    const q = expr[i];
    if (q !== '"' && q !== "'" && q !== "`") continue;
    let j = i + 1, text = "";
    while (j < expr.length && expr[j] !== q) {
      if (q === "`" && expr[j] === "$" && expr[j + 1] === "{") {
        const inner = balanced(expr, j + 1);
        text += "${" + inner + "}";
        j += inner.length + 3;
        continue;
      }
      text += expr[j++];
    }
    // Lo que se compara (=== "days") no es una clase.
    if (!/(===|!==|==|!=)\s*$/.test(expr.slice(0, i))) out.push({ text, template: q === "`" });
    i = j;
  }
  return out;
}

/** Clases dentro de una expresión: literales, condiciones de las plantillas y bem(…). */
/** Trozos de `s` separados por comas de primer nivel (fuera de llaves, corchetes, paréntesis y cadenas). */
function topLevel(s) {
  const out = [];
  let depth = 0, cur = "", q = "";
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = ""; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; cur += ch; continue; }
    if ("{[(".includes(ch)) depth++;
    if ("}])".includes(ch)) depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** bem("bloque", { mod: x, [`c${i}`]: y, [variable]: z }, …mezclas): el bloque, sus modificadores y las mezclas. */
function scanBem(args, f) {
  const [baseArg, mods = "", ...mixes] = topLevel(args).map(s => s.trim());
  const base = (baseArg.match(/^["'`]([\w-]+)["'`]$/) || [])[1];
  if (!base) return;
  add(base, f);
  if (mods.startsWith("{")) {
    for (const k of topLevel(mods.slice(1, -1))) {
      const key = k.split(":")[0].trim();
      if (!key) continue;
      const dyn = key.match(/^\[`([\w-]*)\$\{/);
      if (dyn) prefixes.add(`${base}--${dyn[1]}`);
      else if (key.startsWith("[")) prefixes.add(`${base}--`); // [variable]: cualquier modificador
      else add(`${base}--${key.replace(/["']/g, "")}`, f);
    }
  }
  for (const m of mixes) scan(m, f);
}

function scan(expr, f) {
  // bem(…) se mira aparte y se quita, para que sus claves no cuenten como clases sueltas.
  let rest = "";
  for (let i = 0; i < expr.length;) {
    const at = expr.indexOf("bem(", i);
    if (at < 0) { rest += expr.slice(i); break; }
    rest += expr.slice(i, at);
    const inner = balanced(expr, at + 3);
    scanBem(inner, f);
    i = at + 3 + inner.length + 2;
  }
  for (const { text, template } of literals(rest)) {
    if (!template || !text.includes("${")) {
      for (const w of text.split(/\s+/)) if (w && TOKEN.test(w)) add(w, f);
      continue;
    }
    const inner = [];
    let fixed = "", i = 0;
    while (i < text.length) {
      if (text[i] === "$" && text[i + 1] === "{") {
        const e = balanced(text, i + 1);
        inner.push(e);
        fixed += "\u0000";
        i += e.length + 3;
      } else fixed += text[i++];
    }
    for (const e of inner) scan(e, f);
    for (const w of fixed.split(/\s+/)) {
      if (!w) continue;
      if (w.includes("\u0000")) { const p = w.split("\u0000")[0]; if (p && TOKEN.test(p)) prefixes.add(p); }
      else if (TOKEN.test(w)) add(w, f);
    }
  }
}

for (const f of files.filter(f => /\.tsx?$/.test(f))) {
  const src = fs.readFileSync(f, "utf8");
  const r = rel(f);
  // También las propiedades que acaban en ClassName (eyeClassName…): llevan una clase a un elemento de dentro.
  for (const m of src.matchAll(/[cC]lassName=(?:"([^"]*)"|\{)/g)) {
    if (m[1] !== undefined) scan(`"${m[1]}"`, r);
    else scan(balanced(src, m.index + m[0].length - 1), r);
  }
  for (const m of src.matchAll(/\b(cls|bem|classList\.(?:add|toggle|remove|contains))\(/g)) {
    const inner = balanced(src, m.index + m[0].length - 1);
    if (m[1] === "bem") scanBem(inner, r);
    // En classList.toggle("x", cond) solo cuenta el primer argumento.
    else scan(m[1].startsWith("classList") ? inner.split(",")[0] : inner, r);
  }
  // Prop «base» de un componente que le pone modificadores con bem(base, …) (p. ej. VoteBtn): base--* cuenta.
  for (const m of src.matchAll(/\bbase=(?:"([\w-]+)"|\{)/g)) {
    if (m[1]) { add(m[1], r); prefixes.add(`${m[1]}--`); }
    else scan(balanced(src, m.index + m[0].length - 1), r);
  }
  for (const m of src.matchAll(/\.className\s*=\s*(["'`][^"'`]*["'`])/g)) scan(m[1], r);
  // HTML dentro de cadenas (innerHTML): class="…"
  for (const m of src.matchAll(/class="([^"]*)"/g)) scan(`"${m[1]}"`, r);
  for (const m of src.matchAll(/querySelector(?:All)?(?:<[^>]*>)?\(\s*["'`]([^"'`]*)["'`]/g)) {
    for (const c of m[1].matchAll(/\.([a-zA-Z_][\w-]*)/g)) add(c[1], r);
  }
}

const usedByPrefix = c => [...prefixes].some(p => c.startsWith(p));
const unused = [...defined.keys()].filter(c => !used.has(c) && !usedByPrefix(c)).sort();
const unknown = [...used.keys()].filter(c => !defined.has(c)).sort();

console.log(`Clases en el CSS: ${defined.size} · usadas en los componentes: ${used.size}\n`);
console.log(`CSS sin usar (${unused.length}):`);
for (const c of unused) console.log(`  .${c}  (${[...defined.get(c)].join(", ")})`);
console.log(`\nUsadas sin estilo en el CSS (${unknown.length}) — mezclas, ganchos o erratas:`);
for (const c of unknown) console.log(`  ${c}  (${[...used.get(c)].join(", ")})`);
if (strict && (unused.length || unknown.length)) process.exit(1);
