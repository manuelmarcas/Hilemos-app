// Recorrido funcional de toda la app (modo demo): cada paso hace algo como un usuario y comprueba el resultado.
// Uso: node recorrido.mjs <carpeta para capturas de los fallos>   (PORT y CHROME por variable de entorno)
import { chromium } from "playwright-core";
import fs from "node:fs";
// Puerto del servidor de desarrollo (npx vite --port 5199 --strictPort) y Chrome del sistema.
const BASE = `http://localhost:${process.env.PORT || 5199}/?demo`;
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(BASE).origin });
const errors = [];
const results = [];
let current = null;
async function check(name, fn) {
  try { const r = await fn(); results.push(["✔", name, r ?? ""]); }
  catch (e) {
    results.push(["✘", name, e.message.split("\n")[0]]);
    if (current) await current.screenshot({ path: `${OUT}/fallo-${results.length}.png`, fullPage: true }).catch(() => {});
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
async function page(name) {
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(`${name}: ${e.message}`));
  p.on("console", m => { if (m.type() === "error") errors.push(`${name} (consola): ${m.text()}`); });
  return p;
}
// Ir a una pantalla desde cero (si ya estaba en esa dirección, goto no recarga: se recarga a mano).
const go = async (p, hash) => {
  current = p; await p.bringToFront();
  if (p.url() === BASE + hash) await p.reload(); else await p.goto(BASE + hash);
  await p.waitForTimeout(250);
};
const btn = (p, name) => p.getByRole("button", { name, exact: true });
const yes = async p => { await p.locator("dialog[open] [data-answer=yes]").click(); await p.waitForTimeout(250); };
const dialogText = p => p.locator("dialog[open]").innerText();
const toast = p => p.locator("#toast").innerText();
async function login(p, name) {
  await go(p, "#/");
  await p.fill("#demo-login input", name);
  await p.click("#demo-login button");
  await p.waitForSelector(".topbar__name", { state: "attached" });
}
const dayBtn = (p, n) => p.locator("#sec-slots button[aria-pressed]", { hasText: new RegExp(`^${n}$`) }).first();
async function createDays(p, title, days, opts = ["Cena"], extra) {
  await go(p, "#/nueva");
  await p.fill("#f-title", title);
  await p.locator("#sec-type button", { hasText: /^Días/ }).click();
  await p.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  for (const d of days) await dayBtn(p, d).click();
  if (opts.length > 1) await p.locator(".seg__btn", { hasText: new RegExp(`^${opts.length}$`) }).click();
  for (const [i, o] of opts.entries()) await p.fill(`[data-opt-name="${i}"]`, o);
  if (extra) await extra();
  await btn(p, "Crear votación").click();
  await p.waitForURL(/#\/v\/[^/]+$/);
  return p.url().replace(/^.*#/, "#");
}
async function createOptions(p, title, names, extra) {
  await go(p, "#/nueva");
  await p.fill("#f-title", title);
  await p.locator("#sec-type button", { hasText: /^Opciones/ }).click();
  for (const [i, n] of names.entries()) {
    if (i >= 2) await btn(p, "Añadir opción").click();
    await p.fill(`[data-choice="${i}"]`, n);
  }
  if (extra) await extra();
  await btn(p, "Crear votación").click();
  await p.waitForURL(/#\/v\/[^/]+$/);
  return p.url().replace(/^.*#/, "#");
}
const menu = async (p, item) => {
  await p.getByRole("button", { name: "Opciones de la votación" }).click();
  await p.getByRole("menuitem", { name: item }).click();
};
const menuItems = async p => {
  await p.getByRole("button", { name: "Opciones de la votación" }).click();
  const t = await p.locator(".menu__list").innerText();
  await p.keyboard.press("Escape");
  return t.replace(/\s+/g, " ");
};

// ======================= Sin sesión =======================
const anon = await page("anónimo");
await check("Entrada: aviso propio si falta el nombre", async () => {
  await go(anon, "#/");
  await anon.click("#demo-login button");
  await anon.waitForSelector(".field-error");
  const cls = await anon.locator("#demo-login input").getAttribute("class");
  expect(cls.includes("input--invalid"), "el campo no se marca en rojo: " + cls);
  return await anon.locator(".field-error").innerText();
});
await check("Entrada: enlaces a condiciones y privacidad", async () => {
  await go(anon, "#/");
  await anon.locator(".gate__legal a", { hasText: "política de privacidad" }).click();
  await anon.waitForSelector("h1:has-text('Política de privacidad')");
  expect(await anon.locator(".legal--centered").count() === 1, "la página no va centrada");
  await anon.locator(".legal__other a").click();
  await anon.waitForSelector("h1:has-text('Condiciones de uso')");
  await anon.locator(".page-head__back").click();
  await anon.waitForSelector("h1:has-text('Política de privacidad')");
});

// ======================= Ana crea =======================
const ana = await page("Ana");
await login(ana, "Ana");
await check("Banner del modo demo con su enlace", async () => {
  expect(await ana.locator(".demo-banner__link").count() === 1, "falta el enlace");
});
await check("Crear: estrella de premium en plazo, aprobación, solo correos y, con más de 20 personas, en el máximo", async () => {
  await go(ana, "#/nueva");
  const n = await ana.locator(".premium-tag").count();
  expect(n >= 3, `estrellas: ${n}`);
  expect(await ana.locator("#sec-deadline .premium-tag").count() === 1, "falta en el plazo");
  const max = ana.locator(".create__access-max");
  expect(await max.locator(".premium-tag").count() === 0, "estrella sin pasar de 20");
  await ana.fill("#f-max", "25");
  expect(await max.locator(".premium-tag").count() === 1, "falta la estrella con 25");
  await ana.fill("#f-max", "");
  return `${n} estrellas`;
});
await check("Premium: tocar la etiqueta explica esa función (y no elige la tarjeta)", async () => {
  await ana.locator("#sec-access .type-card", { hasText: "Con tu aprobación" }).locator(".premium-tag").click();
  const t = await dialogText(ana);
  expect(t.includes("Con tu aprobación") && t.includes("Por qué será premium") && t.includes("gratis para todos"), "ventana: " + t);
  await btn(ana, "Entendido").click();
  await ana.waitForSelector("dialog[open]", { state: "detached" });
  expect(await ana.locator("#sec-access .type-card--on", { hasText: "Cualquiera con el enlace" }).count() === 1, "ha elegido la tarjeta");
  // La nota de la estrella, que abre todas las funciones, está al final de «Mis votaciones».
  await go(ana, "#/");
  await ana.getByRole("button", { name: "Qué es premium" }).click();
  const all = await dialogText(ana);
  expect(all.includes("Funciones premium") && all.includes("es temporal"), "la nota no abre todas: " + all);
  // El enlace lleva a las condiciones, ya en su apartado.
  await ana.locator("dialog[open] a", { hasText: "condiciones de uso" }).click();
  await ana.waitForURL(/#\/condiciones$/);
  await ana.locator("#condiciones-premium").waitFor();
  await ana.waitForFunction(() => { const r = document.getElementById("condiciones-premium").getBoundingClientRect(); return r.top > -5 && r.top < innerHeight / 2; });
  const terms = await ana.locator("#condiciones-premium").innerText();
  expect(terms.includes("no da derecho") && terms.includes("al menos 30 días"), "condiciones: " + terms.slice(0, 200));
});
await check("Crear: avisa si falta el nombre", async () => {
  await go(ana, "#/nueva");
  await btn(ana, "Crear votación").click();
  return await ana.locator(".create-bar__status").innerText();
});
await check("Crear: panel de emojis inserta en el título", async () => {
  await go(ana, "#/nueva");
  await ana.fill("#f-title", "Cena");
  await ana.locator("#sec-name .emoji-field__btn").first().click();
  await ana.waitForSelector("emoji-picker.emoji-panel__picker");
  await ana.waitForFunction(() => document.querySelector("emoji-picker")?.shadowRoot?.querySelector(".emoji"));
  // El clic simulado no entra en el DOM aislado del componente: se lanza el evento que emite al elegir uno.
  await ana.evaluate(() => document.querySelector("emoji-picker").dispatchEvent(new CustomEvent("emoji-click", { detail: { unicode: "🍕" } })));
  await ana.waitForTimeout(200);
  const v = await ana.inputValue("#f-title");
  expect(v.length > 4, "no se ha insertado: " + v);
  return v;
});
let days;
await check("Crear votación de días con 2 opciones", async () => {
  days = await createDays(ana, "Cena de Navidad", [4, 5, 11], ["Comida", "Cena"]);
  const n = await ana.locator(".cell__opt:not([disabled]), .day-list__opt:not([disabled])").count();
  expect(n === 6, "casillas votables: " + n);
  return days;
});
await check("Votar y quitar el voto", async () => {
  const b = ana.getByRole("button", { name: "viernes 4 de diciembre · Cena" });
  await b.click(); await ana.waitForTimeout(200);
  expect(await b.getAttribute("aria-pressed") === "true", "no se marca");
  expect((await b.locator(".count").innerText()) === "1", "el contador no sube");
  expect((await b.getAttribute("class")).includes("__opt--on"), "sin --on");
  await b.click(); await ana.waitForTimeout(200);
  expect(await b.getAttribute("aria-pressed") === "false", "no se desmarca");
  await b.click(); await ana.waitForTimeout(200);
});
await check("Compartir: copiar el enlace y QR", async () => {
  await btn(ana, "Compartir").click();
  await ana.waitForSelector(".share__qr-img");
  await ana.locator(".share__link button").click();
  await ana.waitForTimeout(300);
  const t = await toast(ana);
  await ana.keyboard.press("Escape");
  expect(/copiado/i.test(t), "aviso: " + t);
  return t;
});
await check("Añadir al calendario (.ics)", async () => {
  await ana.getByRole("button", { name: "Añadir al calendario" }).click();
  const [dl] = await Promise.all([ana.waitForEvent("download"), ana.getByRole("menuitem", { name: /ics/ }).click()]);
  return dl.suggestedFilename();
});
await check("Imagen del resultado", async () => {
  // Sin menú de compartir del sistema (el de Chrome de escritorio lo tiene): se descarga.
  await ana.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined }); Object.defineProperty(navigator, "canShare", { value: undefined }); });
  const [dl] = await Promise.all([ana.waitForEvent("download"), btn(ana, "Compartir resultado").click()]);
  return dl.suggestedFilename();
});

// ======================= Bea entra, vota y escribe =======================
const bea = await page("Bea");
await login(bea, "Bea");
await check("Bea entra con el enlace y vota", async () => {
  await go(bea, days);
  await bea.getByRole("button", { name: "viernes 11 de diciembre · Cena" }).click();
  await bea.waitForTimeout(200);
  expect(await bea.locator(".cell__opt--on, .day-list__opt--on").count() === 1, "voto no marcado");
});
await check("Chat: mensaje y contador de no leídos", async () => {
  await bea.locator("#ptabbtn-chat").click();
  await bea.fill("[aria-label='Mensaje']", "¡Hola!");
  await btn(bea, "Enviar").click();
  await bea.waitForSelector(".chat__msg--own");
  await go(ana, days);
  await ana.waitForTimeout(400);
  const badge = await ana.locator(".poll-tabs__badge").innerText();
  expect(badge === "1", "no leídos: " + badge);
  await ana.locator("#ptabbtn-chat").click();
  await ana.waitForSelector(".chat__msg:has-text('¡Hola!')");
  return "no leídos: " + badge;
});
await check("Chat (ordenador): Mayúsculas + Intro hace un salto de línea e Intro envía", async () => {
  await go(bea, days);
  await bea.locator("#ptabbtn-chat").click();
  const field = bea.locator("[aria-label='Mensaje']");
  await field.click();
  await bea.keyboard.type("Primera línea");
  await bea.keyboard.press("Shift+Enter");
  await bea.keyboard.type("Segunda línea");
  expect((await field.inputValue()) === "Primera línea\nSegunda línea", "Intro ha enviado: " + JSON.stringify(await field.inputValue()));
  const h = (await field.boundingBox()).height;
  await bea.keyboard.press("Enter");
  const msg = bea.locator(".chat__msg--own", { hasText: "Primera línea" });
  await msg.waitFor();
  expect((await msg.locator(".chat__text").innerText()).includes("\n"), "el mensaje no conserva el salto");
  expect((await field.inputValue()) === "", "el campo no se vacía");
  return `campo con 2 líneas: ${Math.round(h)} px`;
});
await check("Avisar a quien falta (Cris entra sin votar)", async () => {
  const cris = await page("Cris");
  await login(cris, "Cris");
  await go(cris, days);
  // Que le dé tiempo a entrar (se guarda al abrir la votación) antes de cerrar su pestaña.
  await cris.waitForSelector(".poll-tabs");
  await cris.waitForTimeout(600);
  await cris.close();
  await go(ana, days);
  await ana.locator("#ptabbtn-people").click();
  expect(await ana.getByRole("link", { name: /Avisar a quien falta/ }).count() >= 1, "no aparece");
});
const managePanel = p => p.locator("section[aria-label='Gestionar participantes']");
const managedRow = (p, name) => managePanel(p).locator("li", { hasText: name });
await check("Nombrar administradora a Bea (Gestionar participantes, un clic)", async () => {
  await go(ana, days);
  await ana.getByRole("button", { name: "Opciones de la votación" }).click();
  await ana.getByRole("menuitem", { name: "Gestionar participantes" }).click();
  await btn(managedRow(ana, "Bea"), "Hacer admin").click();
  await managedRow(ana, "Bea").getByText("Admin", { exact: true }).waitFor();
  await ana.locator("#ptabbtn-people").click();
  await ana.waitForSelector(".people-table__row:has-text('Bea') .role-tag:has-text('Admin')");
  expect(await ana.getByRole("button", { name: "Hacer admin" }).count() === 1, "la tabla no debe tener botones de admin");
});
await check("Expulsar a Cris y volver a admitirle", async () => {
  await btn(managedRow(ana, "Cris"), "Expulsar").click();
  expect((await dialogText(ana)).includes("¿Expulsar a Cris de la votación?"), "sin confirmación");
  await yes(ana);
  await managePanel(ana).getByText("Expulsados").waitFor();
  expect(await ana.locator(".people-table__row:has-text('Cris')").count() === 0, "Cris sigue en la tabla");
  await btn(managedRow(ana, "Cris"), "Volver a admitir").click();
  await ana.waitForSelector(".people-table__row:has-text('Cris')");
  await btn(managePanel(ana), "Cerrar").click();
  await ana.locator("#ptabbtn-chat").click();
  await ana.waitForSelector(".chat__sys:has-text('Has expulsado a Cris')");
  await ana.locator("#ptabbtn-people").click();
});
await check("Exportar resultados en CSV, Excel y PDF", async () => {
  const sizes = [];
  for (const [name, ext] of [["CSV", "csv"], ["Excel", "xlsx"], ["PDF", "pdf"]]) {
    await ana.getByRole("button", { name: "Opciones de la votación" }).click();
    await ana.getByRole("menuitem", { name: "Exportar resultados" }).click();
    const [dl] = await Promise.all([ana.waitForEvent("download"), ana.locator("dialog[open] button", { hasText: name }).click()]);
    expect(dl.suggestedFilename().endsWith("." + ext), "nombre: " + dl.suggestedFilename());
    const file = `${OUT}/export.${ext}`;
    await dl.saveAs(file);
    sizes.push(`${ext} ${fs.statSync(file).size} B`);
  }
  expect(fs.readFileSync(`${OUT}/export.csv`, "utf8").includes("Bea"), "el CSV no lleva a Bea");
  expect(fs.readFileSync(`${OUT}/export.pdf`).subarray(0, 5).toString() === "%PDF-", "no es un PDF");
  expect(fs.readFileSync(`${OUT}/export.xlsx`).subarray(0, 2).toString() === "PK", "no es un .xlsx");
  return sizes.join(", ");
});
const beaRow = () => ana.locator(".people-table__row:has-text('Bea')");
await check("Ver qué ha votado alguien (la flecha y los números lo despliegan)", async () => {
  await go(ana, days);
  await ana.locator("#ptabbtn-people").click();
  await beaRow().locator(".person-row__caret").click();
  await ana.waitForSelector(".people-table__votes .person-votes__chip");
  await beaRow().locator(".person-row__caret").click();
  await ana.waitForSelector(".people-table__votes", { state: "detached" });
  await beaRow().locator(".people-table__num").first().click();
  await ana.waitForSelector(".people-table__votes .person-votes__chip");
  // Pulsar en la fila fuera del nombre también lo pliega.
  const box = await beaRow().locator("td").first().boundingBox();
  await ana.mouse.click(box.x + box.width - 6, box.y + box.height / 2);
  await ana.waitForSelector(".people-table__votes", { state: "detached" });
});
await check("Perfil de un participante (pulsar en su nombre)", async () => {
  await ana.getByRole("button", { name: "Ver el perfil de Bea" }).click();
  const t = await dialogText(ana);
  expect(t.includes("Bea") && /Ha elegido \d+ opci/.test(t) && /Entró el \d+ de/.test(t), "perfil: " + t);
  await ana.locator("dialog[open] .person-card__section").filter({ hasNotText: "Buscando" }).waitFor();
  expect(/votaciones en común/i.test(await dialogText(ana)), "faltan las votaciones en común");
  expect(await btn(ana.locator("dialog[open]"), "Denunciar").count() === 1, "falta «Denunciar»");
  await btn(ana.locator("dialog[open] .dialog__actions"), "Cerrar").click();
  await ana.getByRole("button", { name: "Ver el perfil de Ana" }).click();
  expect(await ana.locator("dialog[open] a", { hasText: "Editar tu perfil" }).count() === 1, "el propio no lleva a «Tu perfil»");
  const own = await dialogText(ana);
  expect(/Entraste el/.test(own) && /(Has elegido|Aún no has votado)/.test(own), "el propio no va en segunda persona: " + own);
  expect(await btn(ana.locator("dialog[open]"), "Denunciar").count() === 0, "se puede denunciar a sí misma");
  await btn(ana.locator("dialog[open] .dialog__actions"), "Cerrar").click();
  return t.replace(/\s+/g, " ");
});
await check("Denunciar a una persona desde su perfil", async () => {
  await ana.getByRole("button", { name: "Ver el perfil de Bea" }).click();
  await btn(ana.locator("dialog[open]"), "Denunciar").click();
  await ana.locator("dialog[open] h2", { hasText: "Denunciar a Bea" }).waitFor();
  await ana.getByLabel("Spam o publicidad").check();
  await ana.fill("#report-comment", "Prueba");
  await btn(ana, "Enviar denuncia").click();
  await ana.waitForFunction(() => document.querySelector("#toast")?.textContent?.includes("Denuncia enviada"));
  // Quien administra la ve marcada en la tabla y en su perfil.
  await beaRow().locator(".people-table__flag").waitFor();
  await ana.getByRole("button", { name: "Ver el perfil de Bea" }).click();
  const t = await dialogText(ana);
  expect(t.includes("Le han denunciado una vez") && t.includes("Spam o publicidad") && t.includes("«Prueba»"), "el perfil no dice la denuncia: " + t);
  // Ya denunciada: el perfil lo dice y no deja repetir.
  expect(t.includes("Ya le has denunciado"), "no dice que ya la denunció: " + t);
  expect(await btn(ana.locator("dialog[open] .dialog__actions"), "Denunciar").count() === 0, "deja volver a denunciar");
  await btn(ana.locator("dialog[open] .dialog__actions"), "Cerrar").click();
});
await check("Chat: el mensaje que ya has denunciado queda marcado", async () => {
  await ana.locator("#ptabbtn-chat").click();
  const msg = ana.locator(".chat__msg", { hasText: "¡Hola!" });
  // «Ocultar» solo sale en lo denunciado.
  expect(await msg.getByRole("button", { name: "Ocultar el mensaje" }).count() === 0, "se puede ocultar sin denunciar");
  await msg.getByRole("button", { name: /Denunciar mensaje de/ }).click();
  await ana.getByLabel("Spam o publicidad").check();
  await btn(ana, "Enviar denuncia").click();
  await msg.locator(".chat__tool--done").waitFor();
  expect(await msg.getByRole("button", { name: /Denunciar mensaje de/ }).count() === 0, "sigue el botón de denunciar");
  await ana.reload();
  await ana.locator("#ptabbtn-chat").click();
  await ana.locator(".chat__msg", { hasText: "¡Hola!" }).locator(".chat__tool--done").waitFor();
  const again = ana.locator(".chat__msg", { hasText: "¡Hola!" });
  await again.getByRole("button", { name: "Ocultar el mensaje" }).click();
  await again.getByRole("button", { name: "Volver a mostrar el mensaje" }).click();
  await again.getByRole("button", { name: "Ocultar el mensaje" }).waitFor();
});
await check("Descargar mis datos (Tu perfil)", async () => {
  await go(ana, "#/perfil");
  const [dl] = await Promise.all([ana.waitForEvent("download"), btn(ana, "Descargar mis datos").click()]);
  await dl.saveAs(`${OUT}/mis-datos.json`);
  const d = JSON.parse(fs.readFileSync(`${OUT}/mis-datos.json`, "utf8"));
  expect(d.account?.name === "Ana" && d.polls?.length >= 1, "sin cuenta o sin votaciones");
  const p = d.polls.find(x => x.myPersonReports?.length);
  expect(p && p.myPersonReports[0].targetName === "Bea" && p.poll?.iCreatedIt, "falta la denuncia o la votación");
  expect(!JSON.stringify(d).includes('"admins"'), "lleva datos de los demás (admins)");
  return `${dl.suggestedFilename()}: ${d.polls.length} votaciones`;
});

// ======================= Desempate =======================
await check("Desempate: abrir, votar y anular", async () => {
  await go(ana, days);
  await btn(ana, "Desempatar").click();
  await yes(ana);
  await ana.waitForSelector(".tiebreak");
  await ana.locator(".tiebreak__option").first().click();
  await ana.waitForSelector(".tiebreak__option--on");
  await btn(ana, "Anular").click();
  await yes(ana);
  await ana.waitForTimeout(300);
  expect(await ana.locator(".tiebreak").count() === 0, "sigue el desempate");
  expect(await ana.locator(".closed-banner").count() === 1, "debería seguir cerrada");
});
await check("Reabrir la votación", async () => {
  await menu(ana, "Reabrir votación");
  await ana.waitForTimeout(300);
  expect(await ana.locator(".closed-banner").count() === 0, "sigue cerrada");
});
await check("Desempate sin ganadora: solo se puede repetir", async () => {
  await btn(ana, "Desempatar").click();
  await yes(ana);
  await ana.locator(".tiebreak__option").nth(0).click();
  await go(bea, days);
  await bea.locator(".tiebreak__option").nth(1).click();
  await bea.waitForTimeout(300);
  await go(ana, days);
  await btn(ana, "Finalizar desempate").click();
  const t = await dialogText(ana);
  expect(/sin ganadora/.test(t), "diálogo: " + t);
  await yes(ana);
  await ana.waitForSelector("button:has-text('Repetir entre las empatadas')");
  expect(!(await menuItems(ana)).includes("Reabrir"), "deja reabrir");
});
await check("Repetir y finalizar con ganadora: definitivo", async () => {
  await btn(ana, "Repetir entre las empatadas").click();
  await yes(ana);
  await ana.locator(".tiebreak__option").nth(0).click();
  await go(bea, days);
  await bea.locator(".tiebreak__option").nth(0).click();
  await bea.waitForTimeout(300);
  await go(ana, days);
  await btn(ana, "Finalizar desempate").click();
  const t = await dialogText(ana);
  expect(/definitivamente/.test(t), "diálogo: " + t);
  await yes(ana);
  await ana.waitForSelector(".closed-banner--final");
  expect(await ana.locator(".tiebreak__option--win").count() === 1, "sin ganadora marcada");
  expect(await ana.locator(".tiebreak__actions").count() === 0, "aún hay acciones");
  const items = await menuItems(ana);
  expect(!items.includes("Reabrir"), "deja reabrir: " + items);
  return await ana.locator(".closed-banner--final").innerText();
});

// ======================= Gestión =======================
let opts;
await check("Votación de opciones: cerrar y reabrir", async () => {
  opts = await createOptions(ana, "¿Dónde cenamos?", ["Pizza", "Sushi", "Tacos"]);
  expect(await ana.locator(".choice-board__item").count() === 3, "faltan opciones");
  await ana.locator(".choice-board__item", { hasText: "Pizza" }).click();
  await ana.waitForSelector(".choice-board__item--on");
  await menu(ana, "Cerrar votación");
  await yes(ana);
  await ana.waitForSelector(".closed-banner");
  expect(await ana.locator(".choice-board__item[disabled]").count() === 3, "se puede votar cerrada");
  await menu(ana, "Reabrir votación");
  await ana.waitForTimeout(300);
  expect(await ana.locator(".closed-banner").count() === 0, "sigue cerrada");
});
await check("Hacer anónima", async () => {
  await menu(ana, "Hacer anónima");
  await yes(ana);
  await ana.waitForSelector(".mode-pill--anon:has-text('Anónima')");
});
await check("Acceso y plazas: cambiar el máximo", async () => {
  await menu(ana, "Acceso y plazas");
  await ana.fill("#ap-max", "5");
  await ana.locator(".access-panel__actions button", { hasText: "Guardar" }).click();
  await ana.waitForTimeout(300);
  // El máximo está en «Sobre esta votación» (ⓘ junto al título).
  await ana.getByRole("button", { name: "Información de la votación" }).click();
  const k = await ana.locator(".about-dialog").innerText();
  await ana.locator(".about-dialog .dialog__close").click();
  expect(k.includes("máximo 5"), k);
});
await check("Premium en el menú: la etiqueta de «Duplicar» explica y no duplica", async () => {
  await go(ana, opts);
  await ana.getByRole("button", { name: "Opciones de la votación" }).click();
  await ana.getByRole("menuitem", { name: "Duplicar votación" }).locator(".premium-tag").click();
  expect((await dialogText(ana)).includes("Duplicar"), "no explica duplicar");
  await btn(ana, "Entendido").click();
  expect(ana.url().includes("#/v/"), "ha duplicado: " + ana.url());
});
await check("Duplicar", async () => {
  await menu(ana, "Duplicar votación");
  await ana.waitForURL(/#\/nueva/);
  const v = await ana.inputValue("#f-title");
  expect(v.includes("(copia)"), v);
  expect(await ana.locator(".subtitle", { hasText: "Es una copia de otra votación" }).locator(".premium-tag").count() === 1, "falta la etiqueta de la copia");
  expect(await ana.locator("[data-choice='2']").inputValue() === "Tacos", "no copia las opciones");
});
await check("Editar y cancelar sin cambios", async () => {
  await go(ana, opts + "/editar");
  await btn(ana, "Cancelar").click();
  await ana.waitForURL(/#\/v\/[^/]+$/);
});
await check("Editar: renombrar una opción y aviso en el chat", async () => {
  await go(ana, opts + "/editar");
  expect(await ana.locator(".opt-editor__row--locked").count() === 1, "Pizza no sale bloqueada");
  await ana.fill('[data-choice="1"]', "Sushi bar");
  await btn(ana, "Guardar cambios").click();
  await ana.waitForURL(/#\/v\/[^/]+$/);
  await ana.locator("#ptabbtn-chat").click();
  return await ana.locator(".chat__sys").last().innerText();
});

// ======================= Horas, semanas y meses =======================
// Para cada tipo: crear, votar con dos personas (contadores, la más votada y quitar el voto) y lo propio de cada uno.
const createType = async (p, title, type, fill) => {
  await go(p, "#/nueva");
  await p.fill("#f-title", title);
  await p.locator("#sec-type button", { hasText: new RegExp("^" + type) }).click();
  await fill();
  await btn(p, "Crear votación").click();
  await p.waitForURL(/#\/v\/[^/]+$/);
  return p.url().replace(/^.*#/, "#");
};
// Casillas que se pueden votar (en las de horas, las celdas de la tabla).
const units = p => p.locator("main button[aria-pressed]:not([disabled])");
const countOf = async b => Number((await b.locator(".count").innerText().catch(() => "0")).trim() || 0);
/** Ana vota las casillas 0 y 1, Bea solo la 1: la 1 queda primera con 2 votos. Luego Ana quita la 0. */
async function voteFlow(hash, kind) {
  await go(ana, hash);
  const n = await units(ana).count();
  expect(n >= 2, `${kind}: solo hay ${n} casillas para votar`);
  const label1 = await units(ana).nth(1).getAttribute("aria-label");
  await units(ana).nth(0).click(); await ana.waitForTimeout(150);
  await units(ana).nth(1).click(); await ana.waitForTimeout(250);
  expect(await ana.locator("main button[aria-pressed=true]").count() === 2, `${kind}: Ana no tiene 2 votos marcados`);
  await go(bea, hash);
  await bea.getByRole("button", { name: label1, exact: true }).click(); await bea.waitForTimeout(250);
  const b1 = bea.getByRole("button", { name: label1, exact: true });
  expect(await b1.getAttribute("aria-pressed") === "true", `${kind}: el voto de Bea no se marca`);
  expect(await countOf(b1) === 2, `${kind}: la casilla votada por las dos no cuenta 2 (${await countOf(b1)})`);
  await go(ana, hash);
  const first = (await ana.locator(".summary-row--first").first().innerText()).replace(/\s+/g, " ");
  await units(ana).nth(0).click(); await ana.waitForTimeout(250);
  expect(await ana.locator("main button[aria-pressed=true]").count() === 1, `${kind}: no se quita el voto`);
  return `${n} casillas · primera: ${first.slice(0, 60)}`;
}
let hoursRange, hoursList, weeksPoll, monthsPoll;
await check("Horas (rango): crear y votar con dos personas", async () => {
  hoursRange = await createType(ana, "Reunión", "Horas", async () => {
    await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
    for (const d of [1, 2, 3]) await dayBtn(ana, d).click();
  });
  expect(await ana.locator("main table").count() >= 1, "no se ve la tabla de horas");
  return await voteFlow(hoursRange, "horas");
});
await check("Horas: añadir al calendario con la hora", async () => {
  await go(ana, hoursRange);
  const cal = ana.locator(".summary__head").first();
  expect(await cal.count() === 1, "no hay botón de calendario"); // (en el ordenador el resumen sale dos veces)
  const href = await cal.locator("a").first().getAttribute("href").catch(() => null);
  // En Android y en el navegador con menú, el enlace de Google Calendar lleva la hora (…T…); si es un menú, vale con que esté.
  if (href) expect(/dates=\d{8}T\d{4}/.test(href), "el evento no lleva hora: " + href.slice(0, 120));
  return href ? "Google Calendar con hora" : "menú de calendario";
});
await check("Horas sueltas: crear y votar con dos personas", async () => {
  hoursList = await createType(ana, "Llamadas", "Horas", async () => {
    await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
    for (const d of [1, 2]) await dayBtn(ana, d).click();
    await btn(ana, "Horas sueltas").click();
    for (const [i, h] of [[0, "18:00"], [0, "18:30"], [1, "19:00"]]) {
      await ana.locator("#sec-hours button[aria-haspopup=listbox]").nth(i).click();
      await ana.getByRole("option", { name: h }).click();
      await ana.keyboard.press("Escape");
    }
  });
  return await voteFlow(hoursList, "horas sueltas");
});
await check("Semanas: crear y votar con dos personas", async () => {
  weeksPoll = await createType(ana, "Vacaciones", "Semanas", async () => {
    await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
    for (const i of [1, 2, 3]) await ana.locator("#sec-slots button[aria-pressed]").nth(i).click();
  });
  return await voteFlow(weeksPoll, "semanas");
});
await check("Semanas: empate, desempate y resultado definitivo", async () => {
  // Ahora: Ana tiene la 1 y Bea la 1. Ana añade la 2 y Bea también: empate a 2 entre la 1 y la 2.
  await go(ana, weeksPoll);
  await units(ana).nth(2).click(); await ana.waitForTimeout(200);
  await go(bea, weeksPoll);
  await units(bea).nth(2).click(); await bea.waitForTimeout(200);
  await go(ana, weeksPoll);
  await btn(ana, "Desempatar").click();
  await yes(ana);
  await ana.locator(".tiebreak__option").nth(0).click();
  await go(bea, weeksPoll);
  await bea.locator(".tiebreak__option").nth(0).click(); await bea.waitForTimeout(250);
  await go(ana, weeksPoll);
  await btn(ana, "Finalizar desempate").click();
  await yes(ana);
  await ana.waitForSelector(".closed-banner--final");
  return (await ana.locator(".closed-banner--final").innerText()).replace(/\s+/g, " ").slice(0, 90);
});
await check("Meses: crear (pasando de año) y votar con dos personas", async () => {
  monthsPoll = await createType(ana, "Viaje", "Meses", async () => {
    await ana.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
    await ana.locator("#sec-months button[aria-label='Año siguiente']").click();
    await ana.locator("#sec-months button", { hasText: /^Enero$/ }).click();
    await ana.locator("#sec-months button", { hasText: /^Febrero$/ }).click();
  });
  return await voteFlow(monthsPoll, "meses");
});
await check("Meses: editar el título y aviso en el chat", async () => {
  await go(ana, monthsPoll + "/editar");
  await ana.fill("#f-title", "Viaje de invierno");
  await btn(ana, "Guardar cambios").click();
  await ana.waitForURL(/#\/v\/[^/]+$/);
  await ana.locator("#ptabbtn-chat").click();
  return (await ana.locator(".chat__sys").last().innerText()).replace(/\s+/g, " ").slice(0, 80);
});
await check("Horas: expulsar a quien votó borra sus votos y al readmitirle vuelve sin ellos", async () => {
  await go(ana, hoursRange);
  await menu(ana, "Gestionar participantes");
  const row = ana.locator("section[aria-label='Gestionar participantes'] li", { hasText: "Bea" });
  await row.getByRole("button", { name: "Expulsar", exact: true }).click();
  await yes(ana);
  await row.getByRole("button", { name: "Volver a admitir" }).click(); await ana.waitForTimeout(300);
  await go(bea, hoursRange);
  expect(await bea.locator("main button[aria-pressed=true]").count() === 0, "Bea vuelve con sus votos");
});

// ======================= Acceso restringido =======================
let appr;
await check("Con aprobación: Cris queda pendiente y Ana le acepta", async () => {
  appr = await createOptions(ana, "Con aprobación", ["A", "B"], async () => {
    await ana.locator("#sec-access button", { hasText: "Con tu aprobación" }).click();
  });
  const cris = await page("Cris");
  await login(cris, "Cris");
  await go(cris, appr);
  await cris.waitForSelector(".notice--pending .notice__title:has-text('Pendiente')");
  const color = await cris.locator(".notice--pending").evaluate(e => getComputedStyle(e).borderTopWidth);
  expect(color === "2px", "el aviso pendiente no tiene su estilo: " + color);
  await go(ana, appr);
  await ana.locator(".requests__row:has-text('Cris') button", { hasText: "Aceptar" }).click();
  await ana.waitForTimeout(300);
  await go(cris, appr);
  await cris.waitForSelector(".choice-board__item");
  await cris.locator(".choice-board__item").first().click();
  await cris.waitForSelector(".choice-board__item--on");
  await cris.close();
});
await check("Con aprobación: rechazo", async () => {
  await go(bea, appr);
  await bea.waitForSelector(".notice--pending");
  await go(ana, appr);
  await ana.locator(".requests__row:has-text('Bea') button", { hasText: "Rechazar" }).click();
  await ana.waitForTimeout(300);
  await go(bea, appr);
  await bea.waitForSelector(".notice--rejected .notice__title:has-text('No te han aceptado')");
});
await check("Solo estos correos: Bea no puede entrar", async () => {
  const priv = await createOptions(ana, "Privada", ["A", "B"], async () => {
    await ana.locator("#sec-access button", { hasText: "Solo estos correos" }).click();
    await ana.fill("#f-emails", "ana@demo.test");
  });
  await go(bea, priv);
  await bea.waitForSelector(".notice--blocked .notice__title:has-text('Votación privada')");
});

// ======================= Inicio y menú lateral =======================
await check("Inicio: crear grupo y mover una votación", async () => {
  await go(ana, "#/");
  await ana.locator(".groups__chips button", { hasText: "Nuevo grupo" }).click();
  await ana.fill(".inline-form__input", "Familia");
  await btn(ana, "Crear grupo").click();
  await ana.waitForSelector(".groups__chip:has-text('Familia')");
  await ana.locator(".groups__chip", { hasText: "Todas" }).click();
  await ana.locator(".poll-card:has-text('Cena de Navidad') .poll-card__more").click();
  await ana.locator(".poll-card__select").selectOption({ label: "Familia" });
  await ana.waitForTimeout(300);
  await ana.locator(".groups__chip", { hasText: "Familia" }).click();
  const n = await ana.locator(".poll-card").count();
  expect(n === 1, "en Familia hay " + n);
  await ana.locator(".groups__chip", { hasText: "Todas" }).click();
});
await check("Archivar, deshacer y ver archivadas", async () => {
  await go(ana, "#/");
  await ana.locator(".groups__chip", { hasText: "Todas" }).click();
  const before = await ana.locator(".poll-card").count();
  await ana.locator(".poll-card:has-text('Privada') .poll-card__more").click();
  await ana.locator(".poll-card__actions button", { hasText: "Archivar" }).click();
  await ana.waitForSelector(".undo");
  expect(await ana.locator(".poll-card").count() === before - 1, "no se archiva");
  await ana.locator(".undo__btn").click();
  await ana.waitForTimeout(300);
  expect(await ana.locator(".poll-card").count() === before, "no se deshace");
  await ana.locator(".poll-card:has-text('Privada') .poll-card__more").click();
  await ana.locator(".poll-card__actions button", { hasText: "Archivar" }).click();
  await ana.waitForSelector(".archived-row");
  await ana.locator(".archived-row").click();
  await ana.waitForSelector(".poll-card:has-text('Privada')");
});
await check("Menú lateral: buscar y crear grupo", async () => {
  await go(ana, days);
  await ana.fill(".sidebar__search", "dónde");
  await ana.waitForTimeout(200);
  const t = await ana.locator(".sidebar__body").innerText();
  expect(t.includes("¿Dónde cenamos?") && !t.includes("Cena de Navidad"), "el buscador no filtra: " + t.slice(0, 80));
  await ana.fill(".sidebar__search", "");
  await ana.locator(".sidebar__add").click();
  await ana.fill(".sidebar__form-input", "Trabajo");
  await ana.locator(".sidebar__form button", { hasText: "Crear grupo" }).click();
  await ana.waitForTimeout(300);
});
await check("Menú lateral: organizar → archivar", async () => {
  await ana.getByRole("button", { name: "Organizar «Con aprobación»" }).click();
  await ana.locator(".sidebar__menu-item", { hasText: "Archivar" }).click();
  await ana.waitForSelector(".undo");
});

// ======================= Salir y eliminar =======================
await check("Salir de una votación y deshacer: sigue dentro", async () => {
  await go(bea, opts);
  await bea.locator(".poll-leave__btn").click();
  await yes(bea);
  await bea.waitForURL(/#\/$/);
  // Desaparece al momento de la lista, con «Deshacer» mientras corre la cuenta atrás.
  await bea.locator(".undo", { hasText: "Saliendo de" }).waitFor();
  expect(!(await bea.locator(".app").innerText()).includes("¿Dónde cenamos?"), "no desaparece al momento");
  await bea.locator(".undo__btn").click();
  await bea.locator(".poll-card", { hasText: "¿Dónde cenamos?" }).waitFor();
  await bea.waitForTimeout(6000);
  await go(bea, opts);
  expect(await bea.locator(".poll-leave__btn").count() === 1, "ha salido aunque se deshizo");
});
await check("Bea sale de una votación (al acabar la cuenta atrás)", async () => {
  await go(bea, opts);
  await bea.locator(".poll-leave__btn").click();
  await yes(bea);
  await bea.waitForURL(/#\/$/);
  await bea.waitForFunction(() => document.querySelector("#toast")?.textContent?.includes("Has salido"), null, { timeout: 10000 });
  await bea.reload();
  await bea.waitForTimeout(500);
  expect(!(await bea.locator(".app").innerText()).includes("¿Dónde cenamos?"), "sigue en su lista");
});
await check("Ana elimina una votación", async () => {
  await go(ana, appr);
  await menu(ana, "Eliminar votación");
  await yes(ana);
  await ana.waitForURL(/#\/$/);
  await ana.waitForTimeout(300);
  expect(!(await ana.locator(".app__view").innerText()).includes("Con aprobación"), "sigue en la lista");
});

// ======================= Perfil =======================
await check("Perfil: cambiar el nombre", async () => {
  await go(ana, "#/perfil");
  await ana.fill("#pf-name", "Ana María");
  await btn(ana, "Guardar cambios").click();
  await ana.waitForTimeout(400);
  expect((await ana.locator(".topbar__name").innerText()) === "Ana María", "el nombre no cambia arriba");
});
await check("Perfil: tema oscuro, claro y automático", async () => {
  await ana.locator(".theme-pick__card", { hasText: "Oscuro" }).click();
  expect(await ana.evaluate(() => document.documentElement.dataset.theme) === "dark", "no pasa a oscuro");
  await ana.locator(".theme-pick__card", { hasText: "Claro" }).click();
  expect(await ana.evaluate(() => document.documentElement.dataset.theme) === "light", "no pasa a claro");
  await ana.locator(".theme-pick__card", { hasText: "Automático" }).click();
  expect(await ana.evaluate(() => document.documentElement.dataset.theme) === undefined, "no vuelve a automático");
});
await check("Perfil: enlaces legales", async () => {
  await ana.locator(".profile__legal a", { hasText: "Condiciones" }).click();
  await ana.waitForSelector("h1:has-text('Condiciones de uso')");
});

// ======================= Móvil =======================
const mob = await page("Ana móvil");
await mob.setViewportSize({ width: 380, height: 800 });
await login(mob, "Ana");
await check("Móvil: cajón del menú lateral", async () => {
  await go(mob, days);
  await mob.getByRole("button", { name: "Abrir mis votaciones" }).click();
  await mob.waitForTimeout(300);
  expect(await mob.evaluate(() => document.body.classList.contains("page--drawer-open")), "no se abre");
  expect(await mob.evaluate(() => document.activeElement?.classList.contains("sidebar__new")), "el foco no va a «Nueva votación»");
  await mob.keyboard.press("Escape");
  await mob.waitForTimeout(200);
  expect(!(await mob.evaluate(() => document.body.classList.contains("page--drawer-open"))), "no se cierra");
});
await check("Móvil: deslizar para archivar", async () => {
  await go(mob, "#/");
  const fg = mob.locator(".swipe__fg").first();
  const title = await fg.locator(".poll-card__title").innerText();
  const b = await fg.boundingBox();
  const y = b.y + b.height / 2;
  const fire = (type, x) => fg.evaluate((el, [type, x, y]) => el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, pointerId: 7, pointerType: "touch", clientX: x, clientY: y, isPrimary: true,
  })), [type, x, y]);
  await fire("pointerdown", b.x + 20);
  for (let x = b.x + 30; x <= b.x + 280; x += 25) await fire("pointermove", x);
  await mob.waitForTimeout(100);
  const armed = await mob.locator(".swipe__bg--archive.swipe__bg--armed").count();
  await fire("pointerup", b.x + 280);
  await mob.waitForSelector(".undo");
  expect(armed === 1, "el fondo de archivar no aparece");
  return `archivada «${title}»`;
});

// ======================= Resultado =======================
await browser.close();
for (const [ok, name, info] of results) console.log(`${ok} ${name}${info ? "  — " + info : ""}`);
const bad = results.filter(r => r[0] === "✘").length;
console.log(`\n${results.length - bad}/${results.length} bien · errores de la página: ${errors.length ? "\n  " + errors.join("\n  ") : "ninguno"}`);
