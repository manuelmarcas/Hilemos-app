// Capturas de referencia de toda la app (modo demo) con datos y hora fijos, para comparar antes y después de
// renombrar clases. Solo usa selectores que no dependen de las clases: textos, roles, aria-label, ids y data-*.
// Uso: node capturas.mjs <carpeta de salida>   (PORT y CHROME por variable de entorno)
import { chromium } from "playwright-core";
import fs from "node:fs";
// Puerto del servidor de desarrollo (npx vite --port 5199 --strictPort) y Chrome del sistema.
const BASE = `http://localhost:${process.env.PORT || 5199}/?demo`;
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
const NOW = new Date("2026-11-22T12:00:00");
let shots = 0;

async function newPage(seed) {
  const p = await ctx.newPage();
  await p.clock.setFixedTime(NOW);
  // Aleatorio con semilla: los ids y los «nombres sin dueño» salen iguales en cada ejecución.
  await p.addInitScript(s => {
    let x = s;
    Math.random = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  }, seed);
  p.on("pageerror", e => errors.push(e.message));
  return p;
}
const calm = p => p.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important} #toast{visibility:hidden!important}" });
async function go(p, hash) { await p.bringToFront(); await p.goto(BASE + hash); await calm(p); await p.waitForTimeout(250); }
async function shot(p, name, opts = {}) {
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${String(++shots).padStart(2, "0")}-${name}.png`, fullPage: true, ...opts });
}
async function login(p, name) {
  await go(p, "#/");
  await p.fill("#demo-login input", name);
  await p.click("#demo-login button");
  await p.waitForSelector("#who-name");
  await calm(p);
}
const btn = (p, name) => p.getByRole("button", { name, exact: true });
const create = async (p, title, type, fill) => {
  await go(p, "#/nueva");
  await p.fill("#f-title", title);
  await p.locator("#sec-type button", { hasText: new RegExp("^" + type) }).click();
  await fill();
  await btn(p, "Crear votación").click();
  await p.waitForURL(/#\/v\//);
  await calm(p);
  return p.url().replace(/^.*#/, "#");
};
const dayBtn = (p, n) => p.locator("#sec-slots button[aria-pressed]", { hasText: new RegExp(`^${n}$`) }).first();

// ---------- Sin sesión ----------
const anon = await newPage(1);
await go(anon, "#/");
await shot(anon, "entrada");
await go(anon, "#/privacidad");
await shot(anon, "privacidad");
await go(anon, "#/condiciones");
await shot(anon, "condiciones");

// ---------- Ana crea votaciones ----------
const ana = await newPage(2);
await login(ana, "Ana");
await shot(ana, "inicio-vacio");
await go(ana, "#/nueva");
await shot(ana, "crear-vacio");

const days = await create(ana, "Cena de Navidad 🎄", "Días", async () => {
  await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  for (const d of [4, 5, 11, 12, 18]) await dayBtn(ana, d).click();
  await ana.locator("#sec-opts .seg button", { hasText: /^2$/ }).click().catch(async () => {
    await ana.locator("#sec-opts button", { hasText: /^2$/ }).click();
  });
  await ana.fill('[data-opt-name="0"]', "Comida");
  await ana.fill('[data-opt-name="1"]', "Cena");
  await ana.fill("textarea", "Para organizar la cena de empresa");
  await shot(ana, "crear-dias-relleno");
});
const hours = await create(ana, "Reunión", "Horas", async () => {
  await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  for (const d of [1, 2, 3]) await dayBtn(ana, d).click();
  await shot(ana, "crear-horas");
});
const hoursList = await create(ana, "Llamadas", "Horas", async () => {
  await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  for (const d of [1, 2]) await dayBtn(ana, d).click();
  await btn(ana, "Horas sueltas").click();
  for (const [i, h] of [[0, "18:00"], [0, "18:30"], [1, "19:00"]]) {
    await ana.locator("#sec-hours button[aria-haspopup=listbox]").nth(i).click();
    await ana.getByRole("option", { name: h }).click();
    await ana.keyboard.press("Escape");
  }
  await shot(ana, "crear-horas-sueltas");
});
const weeks = await create(ana, "Vacaciones", "Semanas", async () => {
  await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  await ana.locator("#sec-slots button[aria-pressed]").nth(2).click();
  await ana.locator("#sec-slots button[aria-pressed]").nth(3).click();
  await shot(ana, "crear-semanas");
});
const months = await create(ana, "Viaje", "Meses", async () => {
  await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  await ana.locator("#sec-months button[aria-label='Año siguiente']").click();
  await ana.locator("#sec-months button", { hasText: /^Enero$/ }).click();
  await ana.locator("#sec-months button", { hasText: /^Febrero$/ }).click();
  await shot(ana, "crear-meses");
});
const opts = await create(ana, "¿Dónde cenamos?", "Opciones", async () => {
  await ana.fill('[data-choice="0"]', "Pizza");
  await ana.fill('[data-choice="1"]', "Sushi");
  await btn(ana, "Añadir opción").click();
  await ana.keyboard.type("Tacos");
  await shot(ana, "crear-opciones");
});

// Votos de Ana
await go(ana, days);
await ana.getByRole("button", { name: "viernes 4 de diciembre · Cena" }).click();
await ana.getByRole("button", { name: "viernes 11 de diciembre · Cena" }).click();
await ana.getByRole("button", { name: "sábado 5 de diciembre · Comida" }).click();
await go(ana, opts);
await ana.getByRole("button", { name: "Pizza", exact: true }).click();
await go(ana, weeks);
await ana.locator("main button[aria-pressed]:not([disabled])").first().click();
await go(ana, hours);
await ana.locator("main table button:not([disabled])").nth(3).click();
await go(ana, months);
await ana.locator("main button[aria-pressed]:not([disabled])").first().click();

// ---------- Bea vota y escribe en el chat ----------
const bea = await newPage(3);
await login(bea, "Bea");
await go(bea, days);
await bea.getByRole("button", { name: "viernes 4 de diciembre · Cena" }).click();
await bea.getByRole("button", { name: "viernes 11 de diciembre · Cena" }).click();
await bea.locator("#ptabbtn-chat").click();
await bea.fill("[aria-label='Mensaje']", "¡Yo puedo el 4 y el 11!");
await btn(bea, "Enviar").click();
await go(bea, opts);
await bea.getByRole("button", { name: "Sushi", exact: true }).click();
await bea.waitForTimeout(300);

// ---------- La votación de días, en todas sus pestañas ----------
await go(ana, days);
await shot(ana, "votacion-dias");
await ana.locator("#ptabbtn-people").click();
await ana.getByRole("button", { name: /Bea/ }).first().click().catch(() => {});
await shot(ana, "votacion-dias-participantes");
await ana.locator("#ptabbtn-chat").click();
await ana.fill("[aria-label='Mensaje']", "Perfecto");
await btn(ana, "Enviar").click();
await shot(ana, "votacion-dias-chat");
await ana.locator("#ptabbtn-summary").click();
await ana.getByRole("button", { name: /2 votos/ }).first().click().catch(() => {});
await shot(ana, "votacion-dias-mas-votadas");

for (const [name, hash] of [["horas", hours], ["horas-sueltas", hoursList], ["semanas", weeks], ["meses", months], ["opciones", opts]]) {
  await go(ana, hash);
  await shot(ana, "votacion-" + name);
}

// Menús y diálogos
await go(ana, days);
await ana.getByRole("button", { name: "Opciones de la votación" }).click();
await shot(ana, "menu-opciones");
await ana.keyboard.press("Escape");
await btn(ana, "Compartir").click();
await shot(ana, "dialogo-compartir");
await ana.keyboard.press("Escape");
await ana.getByRole("button", { name: "Añadir al calendario" }).click().catch(() => {});
await shot(ana, "menu-calendario");
await ana.keyboard.press("Escape");

// Desempate en «opciones»: abrir, votar, confirmar y definitivo
await go(ana, opts);
await btn(ana, "Desempatar").click();
await shot(ana, "dialogo-desempate");
await ana.locator("dialog[open] [data-answer=yes]").click();
await ana.waitForTimeout(300);
await shot(ana, "desempate-abierto");
await ana.locator("section:has(h2:has-text('Desempate')) button[aria-pressed]", { hasText: "Pizza" }).click();
await btn(ana, "Finalizar desempate").click();
await ana.locator("dialog[open] [data-answer=yes]").click();
await ana.waitForTimeout(300);
await shot(ana, "desempate-definitivo");

// Editar (con candados) y el chat con avisos
await go(ana, days + "/editar");
await shot(ana, "editar-dias");
await ana.fill("#f-title", "Cena de Navidad 2026 🎄");
await btn(ana, "Guardar cambios").click();
await ana.waitForURL(/#\/v\/[^/]+$/);
await calm(ana);
await ana.locator("#ptabbtn-chat").click();
await shot(ana, "chat-con-avisos");
await go(ana, opts + "/editar");
await shot(ana, "editar-opciones-con-desempate");

// Inicio con votaciones, grupos y archivar
await go(ana, "#/");
await shot(ana, "inicio");
await go(ana, "#/perfil");
await shot(ana, "perfil");

// Tooltip
await go(ana, days + "/editar");
const locked = ana.locator("#sec-slots button[data-tip]").first();
const b = await locked.boundingBox();
await ana.mouse.move(b.x + 5, b.y + 5);
await ana.mouse.move(b.x + 8, b.y + 8);
await ana.waitForTimeout(600);
await shot(ana, "tooltip");

// ---------- Oscuro ----------
await ana.emulateMedia({ colorScheme: "dark" });
for (const [name, hash] of [["oscuro-votacion-dias", days], ["oscuro-opciones", opts], ["oscuro-editar", days + "/editar"], ["oscuro-inicio", "#/"], ["oscuro-crear", "#/nueva"]]) {
  await go(ana, hash);
  await shot(ana, name);
}
await ana.emulateMedia({ colorScheme: "light" });

// ---------- Móvil ----------
await ana.setViewportSize({ width: 380, height: 800 });
for (const [name, hash] of [["movil-inicio", "#/"], ["movil-votacion-dias", days], ["movil-horas", hours], ["movil-crear", "#/nueva"], ["movil-editar", days + "/editar"], ["movil-perfil", "#/perfil"]]) {
  await go(ana, hash);
  await shot(ana, name);
}
await go(ana, days);
await ana.getByRole("button", { name: "Abrir mis votaciones" }).click();
await shot(ana, "movil-menu-lateral");

console.log("capturas:", shots, "| errores:", errors.length ? errors : "ninguno");
await browser.close();
