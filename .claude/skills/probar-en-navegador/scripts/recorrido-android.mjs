// Recorrido de la app de Android en un móvil de verdad: controla el WebView de la app (DevTools por adb, solo en las
// compilaciones de depuración) y el sistema (adb: toques, gestos, botón Atrás, rotación, tema, menú de compartir).
// Usa el modo demo (?demo, datos en el móvil) para no tocar los datos reales de nadie; al terminar los borra y deja
// la app como estaba.
//
// Uso (con la app de depuración instalada y abierta, y el móvil conectado por adb):
//   ADB_SERIAL=192.168.1.132:38181 node recorrido-android.mjs <carpeta para capturas>
// Varias personas en un solo WebView: cada una guarda su sesión (sessionStorage del modo demo) y go() la cambia.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const ADB = process.env.ADB || "C:/Users/Marcas/AppData/Local/Android/Sdk/platform-tools/adb.exe";
const SERIAL = process.env.ADB_SERIAL;
const PKG = "app.hilemos";
const adbBuf = (...a) => execFileSync(ADB, [...(SERIAL ? ["-s", SERIAL] : []), ...a], { maxBuffer: 1 << 27 });
const adb = (...a) => adbBuf(...a).toString("utf8");
const sh = cmd => adb("shell", cmd).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- Conectar con el WebView de la app ---
function forward() {
  const pid = sh(`pidof ${PKG}`);
  if (!pid) throw new Error("la app no está abierta");
  try { adb("forward", "--remove", "tcp:9333"); } catch { /* no había */ }
  adb("forward", "tcp:9333", `localabstract:webview_devtools_remote_${pid}`);
}
sh(`am start -n ${PKG}/.MainActivity`);
await sleep(2500);
forward();
let browser = await chromium.connectOverCDP("http://localhost:9333");
let real = browser.contexts()[0].pages()[0];
const ORIGIN = "https://localhost/";
const BASE = ORIGIN + "?demo";
const UKEY = "votaciones-demo-user", DKEY = "votaciones-demo-v2";

const errors = [];
const results = [];
const hook = p => {
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (m.type() === "error") errors.push(`(consola) ${m.text()}`); });
};
hook(real);
async function reconnect() {
  await browser.close().catch(() => {});
  forward();
  browser = await chromium.connectOverCDP("http://localhost:9333");
  real = browser.contexts()[0].pages()[0];
  hook(real);
}
/** Si otra app ha quedado delante (Calendar, el navegador…), la cierra sin guardar y vuelve a la app. */
async function ensureFront() {
  for (let i = 0; i < 8 && !focusIsApp(); i++) {
    const other = (focus().match(/ ([a-z0-9_.]+)\/[^ }]+\}/) || [])[1];
    if (other && other !== PKG && !/launcher|systemui/.test(other)) sh(`am force-stop ${other}`);
    sh(`am start -n ${PKG}/.MainActivity`); await sleep(1200);
  }
}
async function check(name, fn) {
  await ensureFront();
  try { const r = await fn(); results.push(["✔", name, r ?? ""]); }
  catch (e) {
    results.push(["✘", name, e.message.split("\n")[0]]);
    try { fs.writeFileSync(`${OUT}/fallo-${results.length}.png`, adbBuf("exec-out", "screencap", "-p")); } catch { /* sin captura */ }
    // Que un fallo no deje abierto el menú de compartir o un diálogo para el siguiente paso.
    if (!focusIsApp()) { sh("input keyevent KEYCODE_BACK"); await sleep(800); }
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

// --- Personas: la misma página, cada una con su sesión ---
const sessions = {};
let active = null;
function person(name) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === "person") return name;
      if (prop === "close" || prop === "bringToFront") return async () => {};
      const v = real[prop];
      return typeof v === "function" ? v.bind(real) : v;
    },
  });
}
async function go(p, hash) {
  if (active !== p.person) {
    if (active) sessions[active] = await real.evaluate(k => sessionStorage.getItem(k), UKEY);
    await real.evaluate(([k, v]) => { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); }, [UKEY, sessions[p.person] || null]);
    active = p.person;
    await real.goto(BASE + hash);
    await real.reload();
  } else if (real.url() === BASE + hash) await real.reload();
  else await real.goto(BASE + hash);
  await real.waitForTimeout(400);
}
const btn = (p, name) => p.getByRole("button", { name, exact: true });
const yes = async p => { await p.locator("dialog[open] [data-answer=yes]").click(); await p.waitForTimeout(300); };
const dialogText = p => p.locator("dialog[open]").innerText();
const toast = p => p.locator("#toast").innerText();
async function login(p, name) {
  await go(p, "#/");
  await p.fill("#demo-login input", name);
  await p.click("#demo-login button");
  await p.waitForSelector(".topbar__name", { state: "attached" });
}
const dayBtn = (p, n) => p.locator("#sec-slots button[aria-pressed]", { hasText: new RegExp(`^${n}$`) }).first();
async function createDays(p, title, days, opts = ["Cena"]) {
  await go(p, "#/nueva");
  await p.fill("#f-title", title);
  await p.locator("#sec-type button", { hasText: /^Días/ }).click();
  await p.locator("#sec-months button", { hasText: /^Diciembre$/ }).click();
  for (const d of days) await dayBtn(p, d).click();
  if (opts.length > 1) await p.locator(".seg__btn", { hasText: new RegExp(`^${opts.length}$`) }).click();
  for (const [i, o] of opts.entries()) await p.fill(`[data-opt-name="${i}"]`, o);
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

// --- Sistema (adb) ---
const focus = () => sh("dumpsys window | grep -E 'mCurrentFocus='");
function focusIsApp() { try { return focus().includes(PKG); } catch { return true; } }
/** Espera a que se abra el menú de compartir del sistema, lo cierra con Atrás y devuelve qué ventana era. */
async function systemShare(action) {
  await action();
  // Hasta que la ventana del menú tiene el foco (mientras se abre, el foco es «null»).
  let f = "";
  for (let i = 0; i < 30 && !/intentresolver|Chooser|Resolver|[Ss]hare/.test(f = focus()); i++) await sleep(300);
  expect(/intentresolver|Chooser|Resolver|[Ss]hare/.test(f), "no se abre el menú de compartir del sistema: " + f);
  const win = (f.match(/\{[^ ]+ [^ ]+ ([^}]+)\}/) || [])[1] || f;
  sh("input keyevent KEYCODE_BACK");
  for (let i = 0; i < 20 && !focusIsApp(); i++) await sleep(300);
  expect(focusIsApp(), "Atrás no vuelve a la app");
  await sleep(400);
  return win;
}
const dpr = await real.evaluate(() => devicePixelRatio);
/** Centro de un elemento en píxeles de la pantalla (el WebView ocupa toda la pantalla, de borde a borde). */
async function screenPoint(loc) {
  const b = await loc.boundingBox();
  return [Math.round((b.x + b.width / 2) * dpr), Math.round((b.y + b.height / 2) * dpr)];
}
async function tap(loc) {
  // En el centro de la pantalla: arriba lo taparía la barra pegada.
  await loc.evaluate(e => e.scrollIntoView({ block: "center" }));
  await sleep(300);
  const [x, y] = await screenPoint(loc); sh(`input tap ${x} ${y}`); await sleep(600);
}
const keyboardShown = () => /mInputShown=true/.test(sh("dumpsys input_method | grep mInputShown"));

// Empieza sin datos de demo de otras pasadas.
await real.goto(BASE + "#/").catch(() => {});
await real.evaluate(([d, u]) => { localStorage.removeItem(d); sessionStorage.removeItem(u); }, [DKEY, UKEY]);

// ======================= La app en el sistema =======================
await check("Arranque: la app abre la web empaquetada como app nativa", async () => {
  expect(real.url().startsWith(ORIGIN), "dirección: " + real.url());
  expect(await real.evaluate(() => window.Capacitor?.isNativePlatform?.()), "Capacitor no la ve como nativa");
  const v = await real.evaluate(() => navigator.userAgent);
  return v.match(/Chrome\/[\d.]+/)?.[0] + " · " + sh("getprop ro.product.model") + " · Android " + sh("getprop ro.build.version.release");
});
await check("Iconos: lanzador (morado) y aplicación (lila) distintos", async () => {
  const d = sh(`dumpsys package ${PKG} | grep -iE 'icon|versionName'`);
  return d.replace(/\s+/g, " ").slice(0, 120);
});
await check("App Links: hilemos.web.app abre la app (dominio verificado)", async () => {
  const s = sh(`pm get-app-links ${PKG}`);
  expect(/hilemos\.web\.app: verified/.test(s), s.replace(/\s+/g, " "));
  return "verified";
});

// ======================= Sin sesión =======================
const anon = person("anónimo");
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
  await anon.locator(".legal__other a").click();
  await anon.waitForSelector("h1:has-text('Condiciones de uso')");
  await anon.locator(".page-head__back").click();
  await anon.waitForSelector("h1:has-text('Política de privacidad')");
});

// ======================= Ana crea =======================
const ana = person("Ana");
await login(ana, "Ana");
await check("Bordes: la página respeta la barra de estado y los botones de Android", async () => {
  const m = await ana.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const before = getComputedStyle(document.body, "::before");
    return { top: cs.paddingTop, bottom: cs.paddingBottom, band: before.height, bandPos: before.position };
  });
  expect(parseFloat(m.top) > 20, "sin margen arriba: " + m.top);
  expect(parseFloat(m.bottom) > 10, "sin margen abajo: " + m.bottom);
  expect(m.band === m.top && m.bandPos === "fixed", "la franja de la barra de estado no está: " + JSON.stringify(m));
  return `arriba ${m.top}, abajo ${m.bottom}`;
});
await check("Crear: avisa si falta el nombre", async () => {
  await go(ana, "#/nueva");
  await btn(ana, "Crear votación").click();
  return await ana.locator(".create-bar__status").innerText();
});
await check("Teclado: al tocar un campo se abre y el campo queda a la vista", async () => {
  await go(ana, "#/nueva");
  await sleep(800);
  const auto = keyboardShown();
  if (auto) { sh("input keyevent KEYCODE_BACK"); await sleep(600); }
  const f = ana.locator("#f-title");
  await tap(f);
  await sleep(900);
  const shown = keyboardShown();
  const r = await ana.evaluate(() => {
    const b = document.querySelector("#f-title").getBoundingClientRect();
    return { vv: visualViewport.height, ih: innerHeight, top: b.top, bottom: b.bottom, focused: document.activeElement?.id };
  });
  sh("input keyevent KEYCODE_BACK"); await sleep(500);
  expect(shown, "no se abre el teclado");
  expect(r.focused === "f-title", "el campo no recibe el foco");
  expect(r.bottom <= r.vv, `el campo queda bajo el teclado: ${JSON.stringify(r)}`);
  return `visible ${Math.round(r.vv)} de ${r.ih} px` + (auto ? " · OJO: el teclado ya se abría solo al entrar" : "");
});
let days;
await check("Crear votación de días con 2 opciones", async () => {
  days = await createDays(ana, "Cena de Navidad", [4, 5, 11], ["Comida", "Cena"]);
  const n = await ana.locator(".cell__opt:not([disabled])").count();
  expect(n === 6, "casillas votables: " + n);
  return days;
});
await check("Votar y quitar el voto (toques reales)", async () => {
  const b = ana.getByRole("button", { name: "viernes 4 de diciembre · Cena" });
  await tap(b);
  expect(await b.getAttribute("aria-pressed") === "true", "no se marca");
  expect((await b.locator(".count").innerText()) === "1", "el contador no sube");
  await tap(b);
  expect(await b.getAttribute("aria-pressed") === "false", "no se desmarca");
  await tap(b);
});
await check("Barra superior pegada al desplazarse, bajo la barra de estado", async () => {
  await ana.evaluate(() => scrollTo(0, 600));
  await sleep(400);
  const r = await ana.evaluate(() => {
    const t = document.querySelector(".topbar");
    return { top: t.getBoundingClientRect().top, safe: parseFloat(getComputedStyle(document.body).paddingTop), cls: t.className, y: scrollY };
  });
  await ana.evaluate(() => scrollTo(0, 0));
  expect(r.y > 100, "la página no se desplaza: " + r.y);
  expect(Math.abs(r.top - r.safe) < 2, `la barra no se queda arriba: ${JSON.stringify(r)}`);
  expect(r.cls.includes("topbar--scrolled"), "sin sombra al desplazarse");
});
await check("Compartir: diálogo con enlace y QR; copiar el enlace", async () => {
  await btn(ana, "Compartir").click();
  await ana.waitForSelector(".share__qr-img");
  await ana.locator(".share__link button").click();
  await ana.waitForTimeout(400);
  const t = await toast(ana);
  expect(/copiado/i.test(t), "aviso: " + t);
  return t;
});
await check("Botón Atrás de Android: cierra el diálogo sin salir de la votación", async () => {
  expect(await ana.locator("dialog[open]").count() === 1, "no hay diálogo abierto");
  const url = ana.url();
  sh("input keyevent KEYCODE_BACK"); await sleep(600);
  expect(await ana.locator("dialog[open]").count() === 0, "el diálogo sigue abierto");
  expect(ana.url() === url, "ha cambiado de pantalla: " + ana.url());
});
await check("Compartir el enlace con el menú del sistema", async () => {
  await btn(ana, "Compartir").click();
  await ana.waitForSelector(".share__qr-img");
  const b = ana.locator("dialog[open] button", { hasText: /Enviar|Compartir enlace|Compartir…/ }).first();
  expect(await b.count() === 1, "no hay botón para compartir el enlace: " + (await ana.locator("dialog[open]").innerText()).replace(/\s+/g, " ").slice(0, 120));
  return await systemShare(() => b.click());
});
await check("Compartir el QR (imagen) con el menú del sistema", async () => {
  if (!(await ana.locator("dialog[open]").count())) { await btn(ana, "Compartir").click(); await ana.waitForSelector(".share__qr-img"); }
  const r = await systemShare(() => btn(ana, "Compartir QR").click());
  await ana.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
  await sleep(300);
  return r;
});
await check("Añadir al calendario: abre Google Calendar (o el navegador) fuera de la app", async () => {
  // En Android el botón es un enlace a Google Calendar con el evento relleno (lib/ics.ts, Menus.tsx).
  const link = ana.getByRole("link", { name: "Añadir al calendario" });
  expect(await link.count() === 1, "no hay enlace de calendario");
  // Abre otra ventana (target=_blank): sin esperar a que Playwright la siga, que en el WebView no llega.
  await link.evaluate(a => a.click());
  // Espera a que otra app quede delante y estable (antes puede pasar por «null» o por el selector «Abrir con»).
  let f = "", app = "", same = 0;
  for (let i = 0; i < 30 && same < 3; i++) {
    await sleep(400);
    f = focus();
    const a = f.includes(PKG) || /=null/.test(f) ? "" : ((f.match(/ ([a-z0-9_.]+)\/[^ }]+\}/) || [])[1] || "");
    same = a && a === app ? same + 1 : 0;
    app = a;
  }
  expect(app, "no sale de la app: el enlace no hace nada");
  await ensureFront();
  expect(focusIsApp(), "no se vuelve a la app");
  // Al pasar a segundo plano, la conexión de DevTools puede quedarse colgada: se rehace.
  await sleep(1500);
  await reconnect();
  return "abre " + app;
});
await check("Imagen del resultado desde la app", async () => {
  return await systemShare(() => btn(ana, "Compartir resultado").evaluate(b => b.click()));
});

// ======================= Bea entra, vota y escribe =======================
const bea = person("Bea");
await login(bea, "Bea");
await check("Bea entra con el enlace y vota", async () => {
  await go(bea, days);
  await bea.getByRole("button", { name: "viernes 11 de diciembre · Cena" }).click();
  await bea.waitForTimeout(300);
  expect(await bea.locator(".cell__opt--on").count() === 1, "voto no marcado");
});
await check("Chat: mensaje con el teclado del móvil y contador de no leídos", async () => {
  await bea.locator("#ptabbtn-chat").click();
  const input = bea.locator("input[aria-label='Mensaje']");
  await tap(input);
  sh("input text Hola%sdesde%sAndroid");
  await sleep(600);
  expect((await input.inputValue()) === "Hola desde Android", "texto: " + (await input.inputValue()));
  await btn(bea, "Enviar").click();
  await bea.waitForSelector(".chat__msg--own");
  await go(ana, days);
  await ana.waitForTimeout(400);
  const badge = await ana.locator(".poll-tabs__badge").innerText();
  expect(badge === "1", "no leídos: " + badge);
  await ana.locator("#ptabbtn-chat").click();
  await ana.waitForSelector(".chat__msg:has-text('Hola desde Android')");
  return "no leídos: " + badge;
});
await check("Avisar a quien falta (Cris entra sin votar)", async () => {
  const cris = person("Cris");
  await login(cris, "Cris");
  await go(cris, days);
  await go(ana, days);
  await ana.locator("#ptabbtn-people").click();
  expect(await ana.getByRole("link", { name: /Avisar a quien falta/ }).count() >= 1, "no aparece");
});
const managePanel = p => p.locator("section[aria-label='Gestionar participantes']");
const managedRow = (p, name) => managePanel(p).locator("li", { hasText: name });
await check("Nombrar administradora a Bea", async () => {
  await go(ana, days);
  await menu(ana, "Gestionar participantes");
  await btn(managedRow(ana, "Bea"), "Hacer admin").click();
  await managedRow(ana, "Bea").getByText("Admin", { exact: true }).waitFor();
});
await check("Expulsar a Cris y volver a admitirle", async () => {
  await btn(managedRow(ana, "Cris"), "Expulsar").click();
  expect((await dialogText(ana)).includes("¿Expulsar a Cris de la votación?"), "sin confirmación");
  await yes(ana);
  await managePanel(ana).getByText("Expulsados").waitFor();
  await btn(managedRow(ana, "Cris"), "Volver a admitir").click();
  await ana.locator("#ptabbtn-people").click();
  await ana.waitForSelector(".people-table__row:has-text('Cris')");
  await btn(managePanel(ana), "Cerrar").click();
});
for (const [name, ext] of [["CSV", "csv"], ["Excel", "xlsx"], ["PDF", "pdf"]]) {
  await check(`Exportar resultados en ${name} con el menú del sistema`, async () => {
    await go(ana, days);
    await menu(ana, "Exportar resultados");
    return await systemShare(() => ana.locator("dialog[open] button", { hasText: name }).click());
  });
}
await check("Ver qué ha votado alguien (tabla desplegable)", async () => {
  await go(ana, days);
  await ana.locator("#ptabbtn-people").click();
  await ana.locator(".people-table__row:has-text('Bea') .person-row__caret").click();
  await ana.waitForSelector(".people-table__votes .person-votes__chip");
  // Con el dedo: tocar los números de la fila la pliega.
  await tap(ana.locator(".people-table__row:has-text('Bea') .people-table__num").first());
  await ana.waitForSelector(".people-table__votes", { state: "detached" });
});
const actions = p => p.locator("dialog[open] .dialog__actions");
await check("Perfil de un participante al tocar su nombre (sin el rectángulo azul de Android)", async () => {
  const hl = await ana.getByRole("button", { name: "Ver el perfil de Bea" }).evaluate(e => getComputedStyle(e).webkitTapHighlightColor);
  expect(hl === "rgba(0, 0, 0, 0)", "resaltado al tocar: " + hl);
  await tap(ana.getByRole("button", { name: "Ver el perfil de Bea" }));
  await ana.waitForSelector("dialog[open].person-card");
  const t = (await dialogText(ana)).replace(/\s+/g, " ");
  expect(/Ha elegido \d+ opci/.test(t) && /votaciones en común/i.test(t), "perfil: " + t);
  fs.writeFileSync(`${OUT}/perfil.png`, adbBuf("exec-out", "screencap", "-p"));
  await tap(btn(actions(ana), "Cerrar"));
  await ana.waitForSelector("dialog[open]", { state: "detached" });
  return t;
});
await check("Denunciar a una persona desde su perfil (con el dedo)", async () => {
  await tap(ana.getByRole("button", { name: "Ver el perfil de Bea" }));
  await tap(btn(actions(ana), "Denunciar"));
  await ana.locator("dialog[open] h2", { hasText: "Denunciar a Bea" }).waitFor();
  await tap(ana.locator("dialog[open] label", { hasText: "Spam o publicidad" }));
  expect(await ana.getByLabel("Spam o publicidad").isChecked(), "el motivo no se marca");
  await tap(btn(ana, "Enviar denuncia"));
  await ana.waitForFunction(() => document.querySelector("#toast")?.textContent?.includes("Denuncia enviada"));
  await ana.locator(".people-table__row:has-text('Bea') .people-table__flag").waitFor();
  await tap(ana.getByRole("button", { name: "Ver el perfil de Bea" }));
  const t = await dialogText(ana);
  expect(t.includes("Le han denunciado una vez") && t.includes("Spam o publicidad"), "el perfil no la dice: " + t);
  fs.writeFileSync(`${OUT}/perfil-denunciado.png`, adbBuf("exec-out", "screencap", "-p"));
  await tap(btn(actions(ana), "Cerrar"));
});
await check("Chat: en el móvil se denuncia manteniendo pulsado el mensaje", async () => {
  await go(ana, days);
  await ana.locator("#ptabbtn-chat").click();
  const msg = ana.locator(".chat__msg", { hasText: "Hola desde Android" });
  await msg.waitFor();
  expect(await msg.getByRole("button", { name: /Denunciar mensaje de/ }).count() === 0, "sale la bandera en el móvil");
  expect(await msg.getByRole("button", { name: "Ocultar el mensaje" }).count() === 0, "se puede ocultar sin denunciar");
  expect((await ana.locator(".chat__note").innerText()).includes("Mantén pulsado"), "falta la pista");
  // Pulsación larga de verdad, con adb (un deslizamiento sin moverse que dura 900 ms).
  const body = msg.locator(".chat__body");
  await body.evaluate(e => e.scrollIntoView({ block: "center" }));
  await sleep(300);
  const [x, y] = await screenPoint(body);
  sh(`input swipe ${x} ${y} ${x} ${y} 900`);
  await ana.locator("dialog[open] h2", { hasText: "Denunciar mensaje" }).waitFor({ timeout: 5000 });
  await tap(ana.locator("dialog[open] label", { hasText: "Spam o publicidad" }));
  await tap(btn(ana, "Enviar denuncia"));
  await msg.locator(".chat__tool--done").waitFor();
  await msg.getByRole("button", { name: "Ocultar el mensaje" }).waitFor();
  fs.writeFileSync(`${OUT}/chat-denunciado.png`, adbBuf("exec-out", "screencap", "-p"));
  // Desplazar el chat con el dedo no abre la denuncia.
  const other = ana.locator(".chat__msg:not(.chat__msg--own) .chat__body--pressable").first();
  if (await other.count()) {
    const [ox, oy] = await screenPoint(other);
    sh(`input swipe ${ox} ${oy} ${ox} ${oy - 200} 900`);
    await sleep(500);
    expect(await ana.locator("dialog[open]").count() === 0, "desplazar abre la denuncia");
  }
});
await check("Descargar mis datos: menú de compartir del sistema", async () => {
  await go(ana, "#/perfil");
  return await systemShare(() => tap(btn(ana, "Descargar mis datos")));
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
  expect(/definitivamente/.test(await dialogText(ana)), "sin aviso de definitivo");
  await yes(ana);
  await ana.waitForSelector(".closed-banner--final");
  expect(await ana.locator(".tiebreak__option--win").count() === 1, "sin ganadora marcada");
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
  const k = await ana.locator(".poll-head__kicker").innerText();
  expect(k.includes("máx. 5"), k);
});
await check("Duplicar", async () => {
  await menu(ana, "Duplicar votación");
  await ana.waitForURL(/#\/nueva/);
  expect((await ana.inputValue("#f-title")).includes("(copia)"), "sin «(copia)»");
  expect(await ana.locator("[data-choice='2']").inputValue() === "Tacos", "no copia las opciones");
});
await check("Editar: el campo con el foco no queda bajo la barra pegada", async () => {
  await go(ana, opts);
  await ana.evaluate(() => scrollTo(0, 0));
  await ana.evaluate(() => { location.hash += "/editar"; });
  await sleep(1200);
  // Un campo de más abajo: al darle el foco, el navegador lo trae a la vista.
  const f = ana.locator('[data-choice="2"]');
  await ana.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await sleep(300);
  await f.focus();
  await sleep(600);
  await ana.evaluate(() => document.querySelector("#f-title").focus());
  await sleep(800);
  const r = await ana.evaluate(() => ({
    field: document.querySelector("#f-title").getBoundingClientRect().top,
    bar: document.querySelector(".topbar").getBoundingClientRect().bottom,
  }));
  if (keyboardShown()) { sh("input keyevent KEYCODE_BACK"); await sleep(500); }
  expect(r.field >= r.bar - 1, `el título queda bajo la barra: ${JSON.stringify(r)}`);
  return `título a ${Math.round(r.field - r.bar)} px de la barra`;
});
await check("Editar: Atrás de Android sale del formulario", async () => {
  await go(ana, opts);
  await ana.evaluate(() => { location.hash += "/editar"; });
  await sleep(1200);
  // Si el teclado se ha abierto solo, el primer Atrás lo cierra (lo normal en Android).
  const kb = keyboardShown();
  if (kb) { sh("input keyevent KEYCODE_BACK"); await sleep(600); }
  sh("input keyevent KEYCODE_BACK"); await sleep(900);
  expect(/#\/v\/[^/]+$/.test(ana.url()), "sigue en: " + ana.url());
  return kb ? "el teclado se abre solo al entrar: hacen falta dos Atrás" : "";
});
await check("Editar: renombrar una opción y aviso en el chat", async () => {
  await go(ana, opts + "/editar");
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
  const cris = person("Cris");
  await go(cris, appr);
  await cris.waitForSelector(".notice--pending");
  await go(ana, appr);
  await ana.locator(".requests__row:has-text('Cris') button", { hasText: "Aceptar" }).click();
  await ana.waitForTimeout(300);
  await go(cris, appr);
  await cris.waitForSelector(".choice-board__item");
});
await check("Con aprobación: rechazo", async () => {
  await go(bea, appr);
  await bea.waitForSelector(".notice--pending");
  await go(ana, appr);
  await ana.locator(".requests__row:has-text('Bea') button", { hasText: "Rechazar" }).click();
  await ana.waitForTimeout(300);
  await go(bea, appr);
  await bea.waitForSelector(".notice--rejected");
});
await check("Solo estos correos: Bea no puede entrar", async () => {
  const priv = await createOptions(ana, "Privada", ["A", "B"], async () => {
    await ana.locator("#sec-access button", { hasText: "Solo estos correos" }).click();
    await ana.fill("#f-emails", "ana@demo.test");
  });
  await go(bea, priv);
  await bea.waitForSelector(".notice--blocked");
});

// ======================= Inicio y cajón =======================
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
  expect(await ana.locator(".poll-card").count() === 1, "no está en Familia");
  await ana.locator(".groups__chip", { hasText: "Todas" }).click();
});
await check("Deslizar con el dedo para archivar y deshacer", async () => {
  await go(ana, "#/");
  const fg = ana.locator(".swipe__fg").first();
  const title = await fg.locator(".poll-card__title").innerText();
  const before = await ana.locator(".poll-card").count();
  const b = await fg.boundingBox();
  const y = Math.round((b.y + b.height / 2) * dpr);
  sh(`input swipe ${Math.round((b.x + 30) * dpr)} ${y} ${Math.round((b.x + b.width - 20) * dpr)} ${y} 350`);
  await ana.waitForSelector(".undo", { timeout: 4000 });
  expect(await ana.locator(".poll-card").count() === before - 1, "no se archiva");
  await ana.locator(".undo__btn").click();
  await ana.waitForTimeout(400);
  expect(await ana.locator(".poll-card").count() === before, "no se deshace");
  return `«${title}»`;
});
await check("Cajón del menú: se abre con el botón y Atrás no saca de la app", async () => {
  await go(ana, days);
  await tap(ana.getByRole("button", { name: "Abrir mis votaciones" }));
  expect(await ana.evaluate(() => document.body.classList.contains("page--drawer-open")), "no se abre");
  await ana.fill(".sidebar__search", "dónde");
  await ana.waitForTimeout(200);
  const t = await ana.locator(".sidebar__body").innerText();
  expect(t.includes("¿Dónde cenamos?") && !t.includes("Cena de Navidad"), "el buscador no filtra");
  await ana.fill(".sidebar__search", "");
  sh("input keyevent KEYCODE_BACK"); await sleep(700);
  expect(focusIsApp(), "Atrás ha cerrado la app");
  const open = await ana.evaluate(() => document.body.classList.contains("page--drawer-open"));
  expect(!open, "Atrás no cierra el cajón (va a la pantalla anterior: " + ana.url().replace(/^.*#/, "#") + ")");
});

// ======================= Salir y eliminar =======================
await check("Bea sale de una votación", async () => {
  await go(bea, opts);
  await bea.locator(".poll-leave__btn").click();
  await yes(bea);
  await bea.waitForURL(/#\/$/);
});
await check("Ana elimina una votación", async () => {
  await go(ana, appr);
  await menu(ana, "Eliminar votación");
  await yes(ana);
  await ana.waitForURL(/#\/$/);
});

// ======================= Perfil y tema =======================
await check("Perfil: cambiar el nombre", async () => {
  await go(ana, "#/perfil");
  await ana.fill("#pf-name", "Ana María");
  await btn(ana, "Guardar cambios").click();
  await ana.waitForTimeout(400);
  expect((await ana.locator(".topbar__name").textContent()) === "Ana María", "el nombre no cambia arriba");
});
await check("Perfil: tema oscuro, claro y automático", async () => {
  await ana.locator(".theme-pick__card", { hasText: "Oscuro" }).click();
  expect(await ana.evaluate(() => document.documentElement.dataset.theme) === "dark", "no pasa a oscuro");
  await ana.locator(".theme-pick__card", { hasText: "Claro" }).click();
  expect(await ana.evaluate(() => document.documentElement.dataset.theme) === "light", "no pasa a claro");
  await ana.locator(".theme-pick__card", { hasText: "Automático" }).click();
  expect(await ana.evaluate(() => document.documentElement.dataset.theme) === undefined, "no vuelve a automático");
});
/**
 * Evalúa en el WebView con una conexión DevTools propia, sin Playwright: Playwright emula prefers-color-scheme
 * claro en la página a la que se conecta, así que con él el tema del sistema siempre parecería claro.
 */
async function rawEval(expression) {
  const list = await (await fetch("http://localhost:9333/json")).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  const res = await new Promise(r => {
    ws.onmessage = m => r(JSON.parse(m.data));
    ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
  });
  ws.close();
  return res.result?.result?.value;
}
await check("Tema automático: sigue el modo oscuro del móvil, también en vivo", async () => {
  const was = sh("cmd uimode night");
  // Mientras Playwright está conectado, la página tiene el tema claro forzado: se suelta para medir y se vuelve.
  await browser.close().catch(() => {});
  const probe = () => rawEval("JSON.stringify([matchMedia('(prefers-color-scheme: dark)').matches, getComputedStyle(document.body).backgroundColor])").then(JSON.parse);
  try {
    sh("cmd uimode night yes"); await sleep(1500);
    const [dark, dbg] = await probe();
    sh("cmd uimode night no"); await sleep(1500);
    const [light, lbg] = await probe();
    expect(dark && !light, `el WebView no ve el cambio (oscuro=${dark}, claro=${light})`);
    return `fondo ${dbg} en oscuro y ${lbg} en claro`;
  } finally {
    sh(`cmd uimode night ${/yes/.test(was) ? "yes" : /auto/.test(was) ? "auto" : "no"}`);
    await reconnect();
  }
});

// ======================= Sistema: girar, segundo plano y enlaces =======================
await check("Girar el móvil: horizontal y vuelta a vertical", async () => {
  await go(ana, days);
  const acc = sh("settings get system accelerometer_rotation"), rot = sh("settings get system user_rotation");
  try {
    sh("settings put system accelerometer_rotation 0"); sh("settings put system user_rotation 1"); await sleep(2000);
    const l = await ana.evaluate(() => ({
      w: innerWidth, h: innerHeight, sx: document.documentElement.scrollWidth,
      l: getComputedStyle(document.body).paddingLeft, r: getComputedStyle(document.body).paddingRight,
    }));
    fs.writeFileSync(`${OUT}/horizontal.png`, adbBuf("exec-out", "screencap", "-p"));
    expect(l.w > l.h, "no gira: " + JSON.stringify(l));
    expect(l.sx <= l.w + 1, "se sale de la pantalla: " + JSON.stringify(l));
    return `${l.w}×${l.h}, márgenes ${l.l} / ${l.r}`;
  } finally {
    sh("settings put system user_rotation " + (rot === "null" ? 0 : rot)); sh("settings put system accelerometer_rotation " + acc); await sleep(1500);
  }
});
await check("Segundo plano: al volver sigue en la misma pantalla y con la sesión", async () => {
  await go(ana, days);
  const url = ana.url();
  sh("input keyevent KEYCODE_HOME"); await sleep(1500);
  sh(`am start -n ${PKG}/.MainActivity`); await sleep(2000);
  expect(focusIsApp(), "no vuelve a la app");
  expect(ana.url() === url, "ha cambiado de pantalla: " + ana.url());
  expect(await ana.locator(".topbar").count() === 1, "ha perdido la sesión");
});
await check("Enlace de una votación abierto desde fuera abre la app en esa votación", async () => {
  await go(ana, "#/");
  const id = days.replace("#/v/", "");
  sh(`am start -a android.intent.action.VIEW -d 'https://hilemos.web.app/#/v/${id}'`);
  await sleep(2500);
  expect(focusIsApp(), "lo abre otra app: " + focus());
  expect(ana.url().endsWith("#/v/" + id), "no va a la votación: " + ana.url());
});
await check("Salir de la cuenta vuelve a la pantalla de entrada", async () => {
  await go(ana, "#/");
  await btn(ana, "Salir").click();
  await ana.waitForSelector("#demo-login");
});

// ======================= Dejarlo como estaba =======================
await real.evaluate(([d, u]) => { localStorage.removeItem(d); sessionStorage.removeItem(u); }, [DKEY, UKEY]).catch(() => {});
await real.goto(ORIGIN).catch(() => {});
await browser.close();
try { adb("forward", "--remove", "tcp:9333"); } catch { /* nada */ }
for (const [ok, name, info] of results) console.log(`${ok} ${name}${info ? "  — " + info : ""}`);
const bad = results.filter(r => r[0] === "✘").length;
console.log(`\n${results.length - bad}/${results.length} bien · errores de la página: ${errors.length ? "\n  " + [...new Set(errors)].join("\n  ") : "ninguno"}`);
