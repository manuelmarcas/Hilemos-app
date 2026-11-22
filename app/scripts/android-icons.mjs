// Iconos y pantalla de arranque de la app de Android («npm run android:assets»). Salen del logotipo con fondo
// (design-system/logo/logo-recraft-original.svg: el calendario blanco sobre el morado del logo):
//   1. Las imágenes de origen en assets/ (icono antiguo, capas del icono adaptativo y pantallas de arranque).
//   2. capacitor-assets las convierte en los PNG de cada densidad de android/app/src/main/res.
//   3. Se reescriben los iconos adaptativos para usar el calendario en vectorial (drawable/ic_launcher_logo.xml):
//      así se ve nítido a cualquier tamaño, también ampliado en la pantalla de arranque de Android 12+.
// El logotipo sin fondo (logo-lila.svg) es el de dentro de la app; este solo se usa para el icono.
import fs from "node:fs";
import { execSync } from "node:child_process";
import sharp from "sharp";

const RES = "android/app/src/main/res";
const svg = fs.readFileSync("design-system/logo/logo-recraft-original.svg", "utf8");
const all = [...svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)].map(m => ({ fill: m[1], d: m[2] }));
// El primer trazo es el cuadrado de fondo y los cuatro siguientes, las esquinas blancas: el resto es el calendario.
const BG = all[0].fill;
const cal = all.slice(5);
// Caja del calendario en el dibujo original (la misma que la de logo-lila.svg).
const BOX = 720, X0 = 152, Y0 = 156;

/** PNG de 1024 (o `size`) con el calendario al `frac` del ancho, sobre `bg` (null = transparente). */
async function png(out, frac, bg, size = 1024, round = 0) {
  const s = size * frac, k = s / BOX, o = (size - s) / 2;
  const body = cal.map(p => `<path fill="${p.fill}" d="${p.d}"/>`).join("");
  const back = bg ? `<rect width="${size}" height="${size}" rx="${round * size}" fill="${bg}"/>` : "";
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${back}` +
    `<g transform="translate(${o},${o}) scale(${k}) translate(${-X0},${-Y0})">${body}</g></svg>`;
  await sharp(Buffer.from(doc)).png().toFile(out);
}

/** La pantalla de arranque antigua (Android 11 o anterior): el icono con esquinas redondeadas en el centro. */
async function splash(out, pageBg) {
  const S = 2732, icon = Math.round(S * 0.22);
  const tile = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${icon}" height="${icon}"><rect width="${icon}" height="${icon}" rx="${icon * 0.2}" fill="${BG}"/>` +
    `<g transform="translate(${icon * 0.15},${icon * 0.15}) scale(${(icon * 0.7) / BOX}) translate(${-X0},${-Y0})">` +
    cal.map(p => `<path fill="${p.fill}" d="${p.d}"/>`).join("") + "</g></svg>")).png().toBuffer();
  await sharp({ create: { width: S, height: S, channels: 4, background: pageBg } })
    .composite([{ input: tile, gravity: "center" }]).png().toFile(out);
}

await png("assets/icon-only.png", 0.7, BG);          // icono antiguo: a sangre, el sistema le pone la forma
await png("assets/icon-foreground.png", 0.66, null); // capa delantera (capacitor-assets le añade un margen del 16,7 %)
await png("assets/icon-background.png", 0, BG);      // capa trasera: el morado del logo
await splash("assets/splash.png", "#f6f4f7");        // bg del design system
await splash("assets/splash-dark.png", "#1b1619");

execSync(`npx capacitor-assets generate --android --iconBackgroundColor "${BG}" --iconBackgroundColorDark "${BG}"` +
  ` --splashBackgroundColor "#f6f4f7" --splashBackgroundColorDark "#1b1619"`, { stdio: "inherit" });
// capacitor-assets reformatea el AndroidManifest.xml sin cambiar nada: se deja como estaba.
try { execSync("git checkout -- android/app/src/main/AndroidManifest.xml", { stdio: "ignore" }); } catch { /* sin git */ }

// Calendario vectorial: ocupa el 44 % del lienzo de 108dp (dos tercios de lo que se ve del icono), dentro de la zona
// que ninguna máscara recorta.
const VP = Math.round(BOX / 0.44), CX = X0 + BOX / 2, CY = Y0 + BOX / 2;
fs.writeFileSync(`${RES}/drawable/ic_launcher_logo.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por scripts/android-icons.mjs desde design-system/logo/logo-recraft-original.svg: el calendario del icono,
     sin el fondo. Capa delantera del icono adaptativo y de la pantalla de arranque (Android 12+). -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="${VP}" android:viewportHeight="${VP}">
    <group android:translateX="${VP / 2 - CX}" android:translateY="${VP / 2 - CY}">
${cal.map(p => `        <path android:fillColor="${p.fill}" android:pathData="${p.d}"/>`).join("\n")}
    </group>
</vector>
`);
// Icono de la pantalla de arranque (Android 12+): el icono entero, cuadrado morado con esquinas redondeadas y el
// calendario, en vectorial. Lleva su propio fondo porque algunos móviles (ColorOS) no pintan
// windowSplashScreenIconBackgroundColor. Ocupa la mitad del lienzo para caber en el círculo que muestra el sistema.
{
  const V = 1000, T = 500, o = (V - T) / 2, r = T * 0.2, c = T * 0.7, k = c / BOX, co = (V - c) / 2;
  const tile = `M${o + r},${o} H${o + T - r} A${r},${r} 0 0 1 ${o + T},${o + r} V${o + T - r} A${r},${r} 0 0 1 ${o + T - r},${o + T}` +
    ` H${o + r} A${r},${r} 0 0 1 ${o},${o + T - r} V${o + r} A${r},${r} 0 0 1 ${o + r},${o} Z`;
  fs.writeFileSync(`${RES}/drawable/splash_icon.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por scripts/android-icons.mjs: el icono de la app (fondo morado y calendario) para la pantalla de
     arranque de Android 12+ (styles.xml, windowSplashScreenAnimatedIcon). -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="288dp" android:height="288dp"
    android:viewportWidth="${V}" android:viewportHeight="${V}">
    <path android:fillColor="${BG}" android:pathData="${tile}"/>
    <group android:translateX="${co}" android:translateY="${co}" android:scaleX="${k}" android:scaleY="${k}">
        <group android:translateX="${-X0}" android:translateY="${-Y0}">
${cal.map(p => `            <path android:fillColor="${p.fill}" android:pathData="${p.d}"/>`).join("\n")}
        </group>
    </group>
</vector>
`);
}
fs.writeFileSync(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Fondo del icono: el morado de design-system/logo/logo-recraft-original.svg (scripts/android-icons.mjs). -->
    <color name="ic_launcher_background">${BG}</color>
</resources>
`);
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por scripts/android-icons.mjs: el morado del logo detrás y el calendario en vectorial delante, para que se
     vea nítido en el lanzador, en el selector de cuentas de Google y en la pantalla de arranque. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_logo" />
</adaptive-icon>
`;
for (const f of ["ic_launcher", "ic_launcher_round"]) fs.writeFileSync(`${RES}/mipmap-anydpi-v26/${f}.xml`, adaptive);
console.log(`Iconos de Android generados (fondo ${BG}, ${cal.length} trazos del calendario).`);
