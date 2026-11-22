// Capturas de elementos con el ratón encima (o el foco), para comparar dos versiones. Datos y hora fijos.
// Uso: node estados.mjs <puerto> <carpeta>   (CHROME por variable de entorno)
import { chromium } from "playwright-core";
import fs from "node:fs";
const [port, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${port}/?demo`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
await p.clock.setFixedTime(new Date("2026-11-22T12:00:00"));
await p.addInitScript(() => { let x = 7; Math.random = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; });
const calm = () => p.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important} #toast{visibility:hidden!important}" });
const go = async h => { await p.goto(BASE + h); await calm(); await p.waitForTimeout(250); };
let n = 0;
async function hover(name, loc, pad = 6) {
  await p.mouse.move(2, 2);
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.move(b.x + b.width / 2 + 1, b.y + b.height / 2);
  await p.waitForTimeout(500);
  const b2 = await loc.boundingBox();
  await p.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${name}.png`,
    clip: { x: Math.max(0, b2.x - pad), y: Math.max(0, b2.y - pad - 40), width: b2.width + pad * 2, height: b2.height + pad * 2 + 40 } });
}
await go("#/");
await p.fill("#demo-login input", "Ana");
await p.click("#demo-login button");
await p.waitForTimeout(400);

// Crear
await go("#/nueva");
await hover("tipo-seleccionado", p.locator("#sec-type button[aria-pressed=true]"));
await hover("tipo-sin-seleccionar", p.locator("#sec-type button[aria-pressed=false]").first());
await p.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
await hover("mes-seleccionado", p.locator("#sec-months button", { hasText: /^Diciembre$/ }));
await p.locator("#sec-slots button[aria-pressed]", { hasText: /^4$/ }).click();
await hover("dia-seleccionado", p.locator("#sec-slots button[aria-pressed]", { hasText: /^4$/ }));
await hover("dia-sin-seleccionar", p.locator("#sec-slots button[aria-pressed]", { hasText: /^5$/ }));
await hover("opciones-por-dia-seleccionado", p.locator("#sec-opts button[aria-pressed=true]"));
await hover("boton-crear", p.getByRole("button", { name: "Crear votación", exact: true }));
await p.locator("#sec-type button", { hasText: /^Horas/ }).click();
await p.getByRole("button", { name: "Horas sueltas", exact: true }).click();
await hover("chip-seleccionado", p.getByRole("button", { name: "Horas sueltas", exact: true }));
await p.locator("#sec-hours button[aria-haspopup=listbox]").first().click();
await p.getByRole("option", { name: "18:00" }).click();
await hover("hora-marcada-en-desplegable", p.getByRole("option", { name: "18:00" }));
await p.keyboard.press("Escape");

// Votación con votos
await p.locator("#sec-type button", { hasText: /^Días/ }).click();
await p.fill("#f-title", "Prueba");
await p.fill(`[data-opt-name="0"]`, "Cena");
await p.getByRole("button", { name: "Crear votación", exact: true }).click();
await p.waitForURL(/#\/v\//);
const url = p.url().replace(/^.*#/, "#");
await calm();
await hover("boton-principal", p.getByRole("button", { name: "Compartir", exact: true }));
const cell = p.getByRole("button", { name: /viernes 4 de diciembre/ });
await hover("casilla-sin-voto", cell);
await cell.click();
await hover("casilla-votada", cell);
await hover("boton-normal", p.getByRole("button", { name: "Compartir resultado", exact: true }));
await hover("pestana-seleccionada", p.locator("#ptabbtn-summary"));
await hover("pestana", p.locator("#ptabbtn-chat"));
await p.getByRole("button", { name: "Opciones de la votación" }).click();
await hover("menu-item", p.getByRole("menuitem").first());
await hover("menu-item-peligro", p.getByRole("menuitem", { name: "Eliminar votación" }));
await p.keyboard.press("Escape");
await hover("votos-btn", p.getByRole("button", { name: /1 voto/ }).first());
await hover("salir", p.getByRole("button", { name: "Salir de la votación" }));

// Editar: día con votos
await go(url + "/editar");
await hover("dia-con-votos", p.locator("#sec-slots button[aria-pressed]", { hasText: /^4$/ }));

// Inicio: chips de grupo
await go("#/");
await p.getByRole("button", { name: /Nuevo grupo/ }).first().click();
await p.locator("form input").first().fill("Familia");
await p.getByRole("button", { name: "Crear grupo" }).click();
await p.waitForTimeout(300);
await hover("chip-grupo-seleccionado", p.locator("button[aria-pressed=true]", { hasText: "Familia" }));
await hover("chip-grupo", p.locator("button[aria-pressed=false]", { hasText: "Todas" }));
await p.locator("button[aria-pressed=false]", { hasText: "Todas" }).click();
await p.waitForTimeout(200);
await hover("tarjeta-votacion", p.locator("#view a[href*='#/v/']").first());

console.log("capturas:", n);
await browser.close();
