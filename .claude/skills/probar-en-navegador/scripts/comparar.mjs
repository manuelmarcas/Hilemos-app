// Compara dos carpetas de capturas píxel a píxel. Uso: node comparar.mjs <antes> <después> <carpeta de diferencias>
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
const [A, B, D] = process.argv.slice(2);
fs.mkdirSync(D, { recursive: true });
let bad = 0;
for (const f of fs.readdirSync(A).filter(f => f.endsWith(".png")).sort()) {
  const pb = path.join(B, f);
  if (!fs.existsSync(pb)) { console.log("FALTA ", f); bad++; continue; }
  const a = PNG.sync.read(fs.readFileSync(path.join(A, f)));
  const b = PNG.sync.read(fs.readFileSync(pb));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`TAMAÑO ${f}: ${a.width}x${a.height} → ${b.width}x${b.height}`); bad++; continue;
  }
  const out = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.05 });
  if (n) { fs.writeFileSync(path.join(D, f), PNG.sync.write(out)); console.log(`DIF    ${f}: ${n} px`); bad++; }
}
console.log(bad ? `${bad} capturas distintas` : "todas iguales");
