// «Hilemos en tu móvil»: se ofrece sola en el navegador de un iPhone o un Android, con el suyo primero; «Ahora no» la
// aplaza; desde «Tu perfil» se vuelve a abrir; en el ordenador no sale sola.
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
const BASE = "http://localhost:5199/?demo";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const r = [];
const errors = [];
const check = async (name, fn) => { try { r.push("✔ " + name + " " + ((await fn()) ?? "")); } catch (e) { r.push("✘ " + name + " — " + e.message.split("\n")[0]); } };
const expect = (c, m) => { if (!c) throw new Error(m); };
async function enter(ctxOpts, name) {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  await p.goto(BASE + "#/");
  await p.fill("#demo-login input", name);
  await p.click("#demo-login button");
  await p.waitForSelector(".topbar__name", { state: "attached" });
  return p;
}
const dialog = p => p.locator("dialog[open].install");

await check("iPhone: se ofrece sola, con iPhone primero y resaltado", async () => {
  const p = await enter({ ...devices["iPhone 13"] }, "Ana");
  await dialog(p).waitFor({ timeout: 6000 });
  const first = await dialog(p).locator(".install__option").first().innerText();
  expect(first.startsWith("iPhone") && await dialog(p).locator(".install__option--here", { hasText: "iPhone" }).count() === 1, "primero: " + first);
  expect(first.includes("Añadir a pantalla de inicio"), "faltan los pasos");
  await p.screenshot({ path: `${OUT}/iphone.png` });
  await p.getByRole("button", { name: "Ahora no" }).click();
  await p.reload();
  await p.waitForTimeout(3500);
  expect(await dialog(p).count() === 0, "vuelve a salir tras «Ahora no»");
  await p.goto(BASE + "#/perfil");
  await p.getByRole("button", { name: "Cómo instalarla" }).click();
  await dialog(p).waitFor();
  await p.context().close();
});
await check("Android: se ofrece sola, con Android primero (Google Play aún no: desde Chrome)", async () => {
  const p = await enter({ ...devices["Pixel 7"] }, "Bea");
  await dialog(p).waitFor({ timeout: 6000 });
  const first = await dialog(p).locator(".install__option").first().innerText();
  expect(first.startsWith("Android") && first.includes("Muy pronto en Google Play"), "primero: " + first);
  await p.screenshot({ path: `${OUT}/android.png` });
  await p.context().close();
});
await check("Ordenador: no sale sola, pero sí desde «Tu perfil»", async () => {
  const p = await enter({ viewport: { width: 1100, height: 850 } }, "Cris");
  await p.waitForTimeout(3500);
  expect(await dialog(p).count() === 0, "sale sola en el ordenador");
  await p.goto(BASE + "#/perfil");
  await p.getByRole("button", { name: "Cómo instalarla" }).click();
  await dialog(p).waitFor();
  await p.emulateMedia({ colorScheme: "dark" });
  await p.screenshot({ path: `${OUT}/ordenador-oscuro.png` });
  await p.context().close();
});
console.log(r.join("\n"));
console.log("errores:", errors.length ? errors.join(" | ") : "ninguno");
await browser.close();
