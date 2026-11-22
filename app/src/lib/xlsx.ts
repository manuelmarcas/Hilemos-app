// Libro de Excel (.xlsx) mínimo, sin librerías: un .xlsx es un ZIP con unos XML dentro. Solo lo que necesita
// «Exportar resultados»: textos y números, unos pocos estilos, anchos de columna y filas o columnas fijas.

/** Estilos de celda: título, texto gris, cabecera, fila ganadora y casilla marcada. */
export type XStyle = "title" | "muted" | "head" | "best" | "check";
export type XCell = string | number | null | { v: string | number | null; s: XStyle };

export interface XSheet {
  /** Como mucho 31 caracteres y sin []:*?/\ (lo exige Excel). */
  name: string;
  rows: XCell[][];
  /** Ancho de cada columna, en caracteres. */
  widths?: number[];
  /** Filas y columnas que se quedan fijas al desplazarse. */
  freeze?: { rows: number; cols: number };
}

/** Colores (#rrggbb) de los estilos: cabecera, fondo de la ganadora y de lo marcado, títulos y texto gris. */
export interface XColors { head: string; best: string; brand: string; muted: string; line: string }

const STYLE_INDEX: Record<XStyle, number> = { title: 1, muted: 2, head: 3, best: 4, check: 5 };

// Fuera los caracteres de control, que el XML no admite (salvo tabulador y saltos de línea).
const clean = (s: string) => [...s].filter(c => { const n = c.codePointAt(0) || 0; return n >= 32 || n === 9 || n === 10 || n === 13; }).join("");
const esc = (s: string) => clean(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;

/** Letra de una columna: 0 → A, 25 → Z, 26 → AA. */
export function colName(i: number) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function cellXml(c: XCell, ref: string) {
  const { v, s } = c !== null && typeof c === "object" ? c : { v: c, s: null };
  const style = s ? ` s="${STYLE_INDEX[s]}"` : "";
  if (v === null || v === "") return s ? `<c r="${ref}"${style}/>` : "";
  if (typeof v === "number") return `<c r="${ref}"${style}><v>${v}</v></c>`;
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function sheetXml(sh: XSheet) {
  const { rows: fr = 0, cols: fc = 0 } = sh.freeze || {};
  const pane = fr || fc
    ? `<pane${fc ? ` xSplit="${fc}"` : ""}${fr ? ` ySplit="${fr}"` : ""} topLeftCell="${colName(fc)}${fr + 1}" activePane="${fr && fc ? "bottomRight" : fr ? "bottomLeft" : "topRight"}" state="frozen"/>`
    : "";
  const cols = sh.widths?.length
    ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => cellXml(c, `${colName(ci)}${ri + 1}`)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

function stylesXml(c: XColors) {
  const fill = (hex: string) => `<fill><patternFill patternType="solid"><fgColor rgb="${argb(hex)}"/><bgColor indexed="64"/></patternFill></fill>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="${argb(c.brand)}"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="${argb(c.muted)}"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill(c.head)}${fill(c.best)}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="${argb(c.line)}"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

/** El libro entero, listo para guardar como .xlsx. */
export function buildXlsx(sheets: XSheet[], colors: XColors): Uint8Array<ArrayBuffer> {
  const n = sheets.length;
  const files: [string, string][] = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", stylesXml(colors)],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  const enc = new TextEncoder();
  return zipStore(files.map(([name, text]) => ({ name, data: enc.encode(text) })));
}

// ---------- ZIP sin comprimir (método «store»): basta para un .xlsx y no necesita librerías ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 de los datos (el que guarda el ZIP de cada archivo). */
export function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Un ZIP con los archivos tal cual, sin comprimir. Los nombres van en UTF-8. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin comprimir
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true); // 1 de enero de 1980
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, f.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, 0, true);
    cd.setUint16(14, 0x21, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return concat([...parts, ...central, new Uint8Array(end.buffer)]);
}

/** Une varios trozos de bytes en uno. */
export function concat(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(chunks.reduce((a, b) => a + b.length, 0));
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
