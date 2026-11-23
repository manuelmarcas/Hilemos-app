// 100 solicitudes en una votación con aprobación: plegar, ver todas, buscar, seleccionar y rechazar o aceptar en lote.
import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = "http://localhost:5199/?demo";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", e => errors.push(e.message));
const r = [];
const check = async (name, fn) => { try { r.push("✔ " + name + " " + ((await fn()) ?? "")); } catch (e) { r.push("✘ " + name + " — " + e.message.split("\n")[0]); await p.screenshot({ path: `${OUT}/fallo-${r.length}.png` }); } };
const expect = (c, m) => { if (!c) throw new Error(m); };

await p.goto(BASE + "#/");
await p.evaluate(() => localStorage.removeItem("votaciones-demo-v2"));
await p.fill("#demo-login input", "Ana");
await p.click("#demo-login button");
await p.waitForSelector(".topbar__name", { state: "attached" });
await p.goto(BASE + "#/nueva");
await p.fill("#f-title", "Torneo del club");
await p.locator("#sec-type button", { hasText: /^Opciones/ }).click();
await p.fill('[data-choice="0"]', "Sábado");
await p.fill('[data-choice="1"]', "Domingo");
await p.locator("#sec-access .type-card", { hasText: "Con tu aprobación" }).click({ position: { x: 20, y: 20 } });
await p.getByRole("button", { name: "Crear votación", exact: true }).click();
await p.waitForURL(/#\/v\/[^/]+$/);
const id = p.url().split("/v/")[1];
const NAMES = ["Lucía", "Hugo", "Martina", "Pablo", "Sofía", "Mateo", "Valeria", "Leo", "Carmen", "Daniel"];
await p.evaluate(([id, names]) => {
  const db = JSON.parse(localStorage.getItem("votaciones-demo-v2"));
  for (let i = 0; i < 100; i++) {
    (db.votes[id] ||= {})[`demo-p${i}`] = { name: `${names[i % 10]} ${i + 1}`, photo: "", seenAt: Date.now() + i, joinedAt: Date.now(), status: "pending" };
  }
  db.polls[id].members = (db.polls[id].members || 1) + 100;
  localStorage.setItem("votaciones-demo-v2", JSON.stringify(db));
}, [id, NAMES]);
await p.reload();
await p.waitForSelector(".requests");
const rows = () => p.locator(".requests__list .requests__row").count();
const members = () => p.evaluate(id => JSON.parse(localStorage.getItem("votaciones-demo-v2")).polls[id].members, id);

await check("Con 100 solicitudes se ven 5 y «Ver las 100»", async () => {
  expect(await rows() === 5, "filas: " + await rows());
  expect(await p.locator(".requests__count").innerText() === "100", "contador");
  await p.locator(".requests").screenshot({ path: `${OUT}/1-cien.png` });
  await p.getByRole("button", { name: "Ver las 100" }).click();
  expect(await rows() === 100, "no salen todas");
  await p.getByRole("button", { name: "Ver menos" }).click();
  expect(await rows() === 5, "no vuelve a 5");
});
await check("Plegar y desplegar", async () => {
  await p.locator(".requests__toggle").click();
  expect(await rows() === 0 && (await p.locator(".requests__toggle").getAttribute("aria-expanded")) === "false", "no se pliega");
  const h = (await p.locator(".requests").boundingBox()).height;
  await p.locator(".requests").screenshot({ path: `${OUT}/2-plegado.png` });
  await p.locator(".requests__toggle").click();
  expect(await rows() === 5, "no se despliega");
  return `plegado: ${Math.round(h)} px`;
});
await check("Buscar por nombre", async () => {
  await p.fill(".requests__search", "lucia");
  const n = await rows();
  expect(n === 10, "coinciden " + n);
  expect((await p.locator(".requests__check-all").innerText()).includes("Seleccionar las 10 que coinciden"), "texto de seleccionar");
});
await check("Seleccionar las 10 de la búsqueda y aceptarlas", async () => {
  await p.locator(".requests__check-all input").check();
  await p.locator(".requests").screenshot({ path: `${OUT}/3-buscar-seleccionar.png` });
  await p.getByRole("button", { name: "Aceptar (10)" }).click();
  await p.waitForFunction(() => document.querySelector("#toast")?.textContent?.includes("10 personas aceptadas"));
  await p.fill(".requests__search", "");
  expect(await p.locator(".requests__count").innerText() === "90", "quedan " + await p.locator(".requests__count").innerText());
  return "plazas ocupadas: " + await members();
});
await check("Rechazar a todas de una vez (con confirmación)", async () => {
  const before = await members();
  await p.locator(".requests__check-all input").check();
  await p.getByRole("button", { name: "Rechazar (90)" }).click();
  const t = await p.locator("dialog[open]").innerText();
  expect(t.includes("¿Rechazar 90 solicitudes?"), "confirmación: " + t);
  await p.locator("dialog[open] [data-answer=yes]").click();
  await p.waitForFunction(() => document.querySelector("#toast")?.textContent?.includes("90 solicitudes rechazadas"));
  await p.waitForSelector(".requests__sub:has-text('No hay solicitudes pendientes')");
  const after = await members();
  expect(after === before - 90, `plazas: ${before} → ${after}`);
  await p.locator(".requests").screenshot({ path: `${OUT}/4-rechazadas.png` });
  return `plazas: ${before} → ${after}`;
});
await check("Las rechazadas se ven aparte y se pueden volver a aceptar", async () => {
  await p.getByRole("button", { name: "Ver rechazadas (90)" }).click();
  expect(await p.locator(".requests__row--rejected").count() === 90, "rechazadas");
});
await check("Móvil: sin salirse de la pantalla", async () => {
  await p.reload();
  await p.setViewportSize({ width: 380, height: 800 });
  await p.evaluate(([id]) => {
    const db = JSON.parse(localStorage.getItem("votaciones-demo-v2"));
    for (let i = 0; i < 12; i++) (db.votes[id] ||= {})[`demo-q${i}`] = { name: `Nueva ${i + 1}`, photo: "", seenAt: Date.now(), status: "pending" };
    localStorage.setItem("votaciones-demo-v2", JSON.stringify(db));
  }, [id]);
  await p.reload();
  await p.waitForSelector(".requests__row");
  await p.locator(".requests__row").nth(1).locator("input[type=checkbox]").check();
  await p.locator(".requests").screenshot({ path: `${OUT}/5-movil.png` });
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  expect(w <= 380, "ancho " + w);
});
console.log(r.join("\n"));
console.log("errores:", errors.length ? errors.join(" | ") : "ninguno");
await browser.close();
