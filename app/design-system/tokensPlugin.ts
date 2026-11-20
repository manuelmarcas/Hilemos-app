// Plugin de Vite: convierte tokens.json en las variables CSS de la app (módulo virtual «virtual:tokens.css»).
// tokens.json es la única fuente de los valores: styles.css solo los usa con var(--…). Al cambiar tokens.json,
// el servidor de desarrollo recarga los estilos, y un token mal escrito hace fallar la compilación.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const TOKENS = fileURLToPath(new URL("./tokens.json", import.meta.url));
const VIRTUAL = "virtual:tokens.css";
const RESOLVED = "\0" + VIRTUAL;

type Value = string | number | { light: string; dark: string };
interface Token { name: string; value: Value }

/** Flecha de los desplegables, dibujada en el color dado (sale de `muted`). */
const chevron = (hex: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23${hex.replace("#", "")}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

export function tokensCss(json: string): string {
  const t = JSON.parse(json);
  const tokens: Token[] = [
    ...t.color.tokens,
    ...t.shadow.tokens,
    ...t.radius.tokens,
    ...t.spacing.tokens,
    ...t.opacity.tokens,
    ...(t.app?.tokens ?? []),
    ...Object.entries(t.type.families as Record<string, string>).map(([k, v]) => ({ name: `font-${k}`, value: v })),
  ];
  const names = new Set(tokens.map(x => x.name));
  // «{brand}» es un alias de otro token.
  const resolve = (v: string | number, name: string) => {
    const s = String(v);
    const alias = /^\{([\w-]+)\}$/.exec(s);
    if (!alias) return s;
    if (!names.has(alias[1])) throw new Error(`tokens.json: «${name}» apunta a «${alias[1]}», que no existe.`);
    return `var(--${alias[1]})`;
  };
  const light: string[] = [], dark: string[] = [];
  for (const { name, value } of tokens) {
    if (value == null || value === "") throw new Error(`tokens.json: «${name}» no tiene valor.`);
    if (typeof value === "object") {
      if (value.light == null || value.dark == null) throw new Error(`tokens.json: a «${name}» le falta el valor claro u oscuro.`);
      light.push(`--${name}:${resolve(value.light, name)};`);
      dark.push(`--${name}:${resolve(value.dark, name)};`);
    } else {
      light.push(`--${name}:${resolve(value, name)};`);
    }
  }
  const muted = tokens.find(x => x.name === "muted")?.value as { light: string; dark: string };
  light.push(`--chevron:${chevron(muted.light)};`, "color-scheme:light;");
  dark.push(`--chevron:${chevron(muted.dark)};`, "color-scheme:dark;");
  const block = (sel: string, lines: string[]) => `${sel}{\n  ${lines.join("\n  ")}\n}`;
  return [
    "/* Generado desde design-system/tokens.json (tokensPlugin.ts): no se edita a mano. */",
    block(":root", light),
    // El sistema decide si no hay elección (data-theme), y data-theme manda si la hay.
    `@media (prefers-color-scheme:dark){\n${block(':root:not([data-theme="light"])', dark)}\n}`,
    block(':root[data-theme="dark"]', dark),
  ].join("\n");
}

export function designTokens(): Plugin {
  return {
    name: "design-tokens",
    resolveId: id => (id === VIRTUAL ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      this.addWatchFile(TOKENS);
      return tokensCss(readFileSync(TOKENS, "utf8"));
    },
    configureServer(server) {
      server.watcher.add(TOKENS);
      server.watcher.on("change", file => {
        if (file.replace(/\\/g, "/").toLowerCase() !== TOKENS.replace(/\\/g, "/").toLowerCase()) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.reloadModule(mod);
      });
    },
  };
}
