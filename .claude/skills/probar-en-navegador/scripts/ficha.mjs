// Ficha de Google Play: imagen destacada (1024×500) y capturas del móvil (1080×1920, 9:16), en el modo demo con
// datos de ejemplo y sin el banner de la demo. Uso: node ficha.mjs <carpeta de salida>
import { chromium } from "playwright-core";
import fs from "node:fs";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5199/?demo";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const NOW = new Date(2026, 10, 24, 18, 0).getTime();
const day = (d, h = 12) => new Date(2026, 10, d, h).getTime(); // noviembre de 2026

// ---------- Datos de ejemplo ----------
const people = ["Ana", "Bea", "Carlos", "Diego", "Elena", "Fran", "Lucía", "Marta"];
const uid = n => `demo-${n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
const days = ["2026-12-04", "2026-12-05", "2026-12-11", "2026-12-12", "2026-12-18", "2026-12-19", "2026-12-20"];
const navidad = {
  title: "Cena de Navidad 🎄", description: "Elegimos día para la cena de la familia. Marca todos los que te vengan bien.",
  type: "days", months: ["2026-12"], slots: days,
  options: [{ id: "c", name: "Comida", icon: "🍽️" }, { id: "n", name: "Cena", icon: "🌙" }],
  ownerUid: uid("Ana"), ownerName: "Ana", createdAt: day(20), closed: false, anonymous: false,
};
const pick = (...k) => k;
const navidadVotes = {
  Ana: pick("2026-12-12|n", "2026-12-19|n", "2026-12-19|c", "2026-12-05|n"),
  Bea: pick("2026-12-19|n", "2026-12-12|n", "2026-12-20|c"),
  Carlos: pick("2026-12-19|n", "2026-12-18|n", "2026-12-11|n"),
  Diego: pick("2026-12-19|n", "2026-12-19|c", "2026-12-12|n", "2026-12-05|c"),
  Elena: pick("2026-12-19|n", "2026-12-20|c", "2026-12-04|n"),
  Fran: pick("2026-12-12|n", "2026-12-19|n", "2026-12-18|n"),
  Lucía: pick("2026-12-19|n", "2026-12-05|n", "2026-12-12|c"),
  Marta: [],
};
const opts = [
  { id: "ita", name: "Italiano", icon: "🍝" }, { id: "jap", name: "Japonés", icon: "🍣" },
  { id: "mex", name: "Mexicano", icon: "🌮" }, { id: "asa", name: "Asador", icon: "🥩" }, { id: "ind", name: "Indio", icon: "🍛" },
];
const cumple = {
  title: "Restaurante para el cumple de Lucía", type: "options", months: [], slots: opts.map(o => o.id), options: opts,
  ownerUid: uid("Bea"), ownerName: "Bea", createdAt: day(22), closed: false, anonymous: false,
};
const cumpleVotes = {
  Bea: ["jap|v", "ita|v"], Ana: ["jap|v", "mex|v"], Carlos: ["ita|v", "jap|v", "asa|v"], Diego: ["jap|v"], Elena: ["mex|v", "jap|v"], Fran: ["asa|v", "ita|v"],
};
const viaje = {
  title: "Viaje de verano ☀️", type: "months", months: ["2027-06", "2027-07", "2027-08", "2027-09"],
  slots: ["2027-06", "2027-07", "2027-08", "2027-09"], options: [{ id: "x", name: "Me viene bien", icon: "✅" }],
  ownerUid: uid("Carlos"), ownerName: "Carlos", createdAt: day(15), closed: false, anonymous: false,
};
const viajeVotes = { Carlos: ["2027-07|x", "2027-08|x"], Ana: ["2027-07|x"], Bea: ["2027-07|x", "2027-09|x"], Fran: ["2027-08|x"] };
const club = {
  title: "Reunión del club de lectura", type: "hours", months: ["2026-11", "2026-12"],
  slots: ["2026-11-30", "2026-12-01", "2026-12-02"], hours: ["18:00", "19:00", "20:00"], hourStep: 60, options: [{ id: "x", name: "Me viene bien", icon: "✅" }],
  ownerUid: uid("Ana"), ownerName: "Ana", createdAt: day(18), closed: true, anonymous: false,
};
const votesOf = obj => Object.fromEntries(Object.entries(obj).map(([n, picks]) => [uid(n), { name: n, photo: "", picks, joinedAt: day(20), updatedAt: day(21) }]));
const msgs = [
  ["Bea", "¿El 19 por la noche os va bien a todos?", day(21, 19)],
  ["Diego", "A mí perfecto, y si es cena mejor 😄", day(21, 20)],
  ["Lucía", "Yo llego sobre las nueve, que salgo tarde del trabajo", day(22, 10)],
  ["Fran", "Pues el 19 cena. ¿Reservo en el de siempre?", day(23, 13)],
  ["Ana", "¡Sí! Reserva para 8, que Marta aún no ha votado", day(23, 13)],
];
const chat = { p1: Object.fromEntries(msgs.map(([n, text, at], i) => [`m${i}`, { uid: uid(n), name: n, text, at }])) };
const lib = {
  polls: {
    p1: { title: navidad.title, type: "days", role: "owner", groupId: "fam", addedAt: day(20), chatSeenAt: day(23, 14) },
    p2: { title: cumple.title, type: "options", role: "participant", ownerName: "Bea", groupId: "ami", addedAt: day(22) },
    p3: { title: viaje.title, type: "months", role: "participant", ownerName: "Carlos", groupId: "ami", addedAt: day(15) },
    p4: { title: club.title, type: "hours", role: "owner", groupId: "tra", addedAt: day(18) },
  },
  groups: { fam: { name: "Familia", createdAt: 1 }, ami: { name: "Amigos", createdAt: 2 }, tra: { name: "Club", createdAt: 3 } },
};
const db = {
  polls: { p1: navidad, p2: cumple, p3: viaje, p4: club },
  votes: { p1: votesOf(navidadVotes), p2: votesOf(cumpleVotes), p3: votesOf(viajeVotes), p4: votesOf({ Ana: ["2026-12-01|x"], Bea: ["2026-12-01|x"] }) },
  users: { [uid("Ana")]: lib },
  chat,
};

async function phone() {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "light", locale: "es-ES", timezoneId: "Europe/Madrid" });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(NOW);
  await p.addInitScript(([d, u]) => {
    if (!localStorage.getItem("seeded")) { localStorage.setItem("votaciones-demo-v2", JSON.stringify(d)); localStorage.setItem("seeded", "1"); }
    sessionStorage.setItem("votaciones-demo-user", JSON.stringify(u));
    localStorage.setItem("hilemos-push-offered", "1");
  }, [db, { uid: uid("Ana"), name: "Ana", photo: "", email: "ana@demo.test" }]);
  return p;
}
const clean = p => p.addStyleTag({ content: "#demo-banner{display:none!important}*{transition:none!important;animation:none!important;caret-color:transparent!important}#toast{display:none!important}" });
async function shot(p, hash, name, before) {
  await p.goto(BASE + hash);
  await p.waitForTimeout(900);
  await clean(p);
  if (before) await before(p);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log("captura", name);
}

const p = await phone();
await shot(p, "#/v/p1", "1-votar", async q => {
  await q.getByText(/^diciembre 2026$/i).first()
    .evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90));
});
await shot(p, "#/v/p1", "2-mas-votadas", async q => {
  await q.locator("#ptab-summary").scrollIntoViewIfNeeded();
  await q.evaluate(() => window.scrollBy(0, -80));
});
await shot(p, "#/v/p2", "3-opciones", async q => {
  await q.evaluate(() => { const h = [...document.querySelectorAll("h1")][0]; window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 80); });
});
await shot(p, "#/", "4-mis-votaciones");
await shot(p, "#/v/p1", "5-chat", async q => {
  await q.getByRole("tab", { name: /Chat/ }).click();
  await q.waitForTimeout(500);
  await q.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
});
await shot(p, "#/nueva", "6-crear");

// ---------- Imagen destacada ----------
const icon = fs.readFileSync(process.argv[3]).toString("base64");
const fg = await (await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 })).newPage();
await fg.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@500;600&display=block">
<style>
  body{margin:0;width:1024px;height:500px;background:#5e2a59;display:flex;align-items:center;justify-content:center;gap:56px;font-family:Figtree,sans-serif;overflow:hidden}
  img{width:300px;height:300px;border-radius:64px}
  .t{color:#fff;max-width:520px}
  .w{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:104px;line-height:1;letter-spacing:-2px;margin:0 0 18px}
  .h{color:#dca6d2}
  .s{font-size:34px;font-weight:600;line-height:1.25;margin:0}
</style></head><body>
<img src="data:image/png;base64,${icon}">
<div class="t"><p class="w"><span class="h">Hile</span>mos</p><p class="s">Elegid juntos el día, la hora o el plan, sin líos de mensajes.</p></div>
</body></html>`);
await fg.waitForTimeout(1500);
await fg.screenshot({ path: `${OUT}/imagen-destacada-1024x500.png` });
console.log("imagen destacada");
await browser.close();
