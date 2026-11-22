// PDF mínimo, sin librerías: cada página es una imagen JPEG a tamaño A4. Así el informe se dibuja con el mismo
// canvas que la imagen del resultado (con sus fuentes y emojis) y el PDF solo tiene que envolverlo.
import { concat } from "./xlsx";

export interface PdfPage {
  /** La página en JPEG. */
  jpeg: Uint8Array;
  /** Tamaño de la imagen en píxeles. */
  width: number;
  height: number;
}

// A4 en puntos (1/72 de pulgada).
const A4_W = 595.28;
const A4_H = 841.89;

// Texto de PDF en UTF-16 (admite tildes y cualquier carácter), en hexadecimal: <FEFF…>.
const pdfText = (s: string) => `<FEFF${[...s].map(c => {
  const cp = c.codePointAt(0) || 0;
  const units = cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp];
  return units.map(u => u.toString(16).padStart(4, "0").toUpperCase()).join("");
}).join("")}>`;

/** El PDF con una página por imagen y `title` como título del documento. */
export function buildPdf(pages: PdfPage[], title: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (c: Uint8Array | string) => {
    const b = typeof c === "string" ? enc.encode(c) : c;
    chunks.push(b);
    size += b.length;
  };
  // Objetos: 1 catálogo, 2 páginas, 3 información; después, por cada página, la página, su contenido y su imagen.
  const obj = (n: number, body: string | Uint8Array[]) => {
    offsets[n] = size;
    push(`${n} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body.forEach(push);
    push("\nendobj\n");
  };
  const pageIds = pages.map((_, i) => 4 + i * 3);

  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // marca de archivo binario
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  obj(3, `<< /Title ${pdfText(title)} /Producer (Hilemos) >>`);
  pages.forEach((p, i) => {
    const [page, content, image] = [pageIds[i], pageIds[i] + 1, pageIds[i] + 2];
    obj(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    const draw = `q ${A4_W} 0 0 ${A4_H} 0 0 cm /Im0 Do Q`;
    obj(content, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    obj(image, [
      enc.encode(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`),
      p.jpeg,
      enc.encode("\nendstream"),
    ]);
  });
  const count = 4 + pages.length * 3;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return concat(chunks);
}
