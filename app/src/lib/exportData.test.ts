import { describe, expect, it } from "vitest";
import { exportFileName, exportTable, rankedRows, toCsv, toXlsx, voterNames } from "./exportData";
import { tally, tiebreakTally } from "./model";
import type { Poll, PollData, Vote, Votes } from "./types";
import { buildXlsx, colName, crc32, zipStore } from "./xlsx";
import { buildPdf } from "./pdf";

const COMIDA = { id: "c", name: "Comida", icon: "🍽️" };
const CENA = { id: "n", name: "Cena", icon: "🌙" };
const days = (extra: Partial<PollData> = {}): Poll => ({
  id: "p1", title: "Cena de Navidad", type: "days", months: ["2025-12"], ownerUid: "ana",
  slots: ["2025-12-15", "2025-12-16"], options: [COMIDA, CENA], ...extra,
});
const vote = (name: string, picks: string[], extra: Vote = {}): Vote => ({ name, picks, ...extra });
const votes: Votes = {
  ana: vote("Ana", ["2025-12-16|c", "2025-12-15|n"]),
  bea: vote("Bea", ["2025-12-16|c"]),
  ido: vote("Ido", ["2025-12-15|n"], { gone: true }),
};
const COLORS = { head: "#eeeaef", best: "#e5f2ea", brand: "#451d42", muted: "#6b5e66", line: "#e2dde4" };
const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe("exportTable", () => {
  const poll = days();
  const t = exportTable(poll, tally(poll, votes), null);

  it("una fila por casilla, en el orden del calendario y también sin votos", () => {
    expect(t.columns).toEqual(["Día", "Opción"]);
    expect(t.rows.map(r => r.key)).toEqual(["2025-12-15|c", "2025-12-15|n", "2025-12-16|c", "2025-12-16|n"]);
    expect(t.rows[0].labels).toEqual(["Lunes 15 de diciembre de 2025", "🍽️ Comida"]);
    expect(t.rows.map(r => r.votes)).toEqual([0, 2, 2, 0]);
  });

  it("puestos compartidos en el empate y sin ganadora", () => {
    expect(t.rows.map(r => r.rank)).toEqual([null, 1, 1, null]);
    expect(t.rows.some(r => r.winner)).toBe(false);
  });

  it("la clasificación pone primero las más votadas y quién votó cada una, por nombre", () => {
    const ranked = rankedRows(t);
    expect(ranked.map(r => r.key)).toEqual(["2025-12-15|n", "2025-12-16|c", "2025-12-15|c", "2025-12-16|n"]);
    expect(voterNames(t, ranked[0])).toEqual(["Ana", "Ido"]);
  });

  it("participantes con su papel; quien se fue no cuenta como participante, pero sus votos sí", () => {
    expect(t.people.map(p => [p.name, p.role, p.gone])).toEqual([["Ana", "Creador", false], ["Bea", "", false], ["Ido", "", true]]);
    expect(t.meta).toBe("Votación por días · 2 participantes");
  });

  it("con desempate finalizado, su ganadora y sus votos", () => {
    const closed = days({ closed: true, tiebreak: { id: 7, candidates: ["2025-12-15|n", "2025-12-16|c"], done: true } });
    const v: Votes = { ...votes, bea: { ...votes.bea, tb: { id: 7, pick: "2025-12-16|c" } } };
    const tt = exportTable(closed, tally(closed, v), tiebreakTally(closed, v));
    expect(tt.tiebreak).toBe(true);
    expect(tt.rows.find(r => r.winner)?.key).toBe("2025-12-16|c");
    expect(tt.rows.map(r => r.tb)).toEqual([null, 0, 1, null]);
  });

  it("las de horas separan el día y la franja", () => {
    const hours = days({ type: "hours", options: undefined, slots: ["2025-12-15"], hours: ["18:00"], hourStep: 60 });
    const th = exportTable(hours, tally(hours, {}), null);
    expect(th.columns).toEqual(["Día", "Hora"]);
    expect(th.rows[0].labels).toEqual(["Lunes 15 de diciembre de 2025", "18:00–19:00"]);
  });
});

describe("toCsv", () => {
  const poll = days();
  const csv = toCsv(exportTable(poll, tally(poll, votes), null));
  const lines = csv.slice(1).trim().split("\r\n");

  it("con la marca de UTF-8, punto y coma y una columna por persona", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe("Día;Opción;Votos;Puesto;Ana;Bea;Ido");
    expect(lines[2]).toBe("Lunes 15 de diciembre de 2025;🌙 Cena;2;1;Sí;;Sí");
    expect(lines).toHaveLength(5);
  });

  it("en las anónimas, sin nombres", () => {
    const anon = days({ anonymous: true });
    const head = toCsv(exportTable(anon, tally(anon, votes), null)).slice(1).split("\r\n")[0];
    expect(head).toBe("Día;Opción;Votos;Puesto");
  });

  it("entrecomilla lo que lleva separadores y desactiva lo que parecería una fórmula", () => {
    const tricky: Votes = { x: vote('=HYPERLINK("a")', ["2025-12-15|c"]), y: vote("Pérez; Juan", []) };
    const head = toCsv(exportTable(poll, tally(poll, tricky), null)).slice(1).split("\r\n")[0];
    expect(head).toContain(`"'=HYPERLINK(""a"")"`);
    expect(head).toContain('"Pérez; Juan"');
  });
});

describe("Excel y PDF", () => {
  it("crc32 y nombres de columna", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect([0, 25, 26, 27, 701, 702].map(colName)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"]);
  });

  it("el ZIP empieza y acaba con sus firmas y guarda los archivos tal cual", () => {
    const z = zipStore([{ name: "a.txt", data: new TextEncoder().encode("hola") }]);
    const dv = new DataView(z.buffer);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    expect(dv.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(text(z)).toContain("a.txthola");
  });

  it("el libro lleva sus tres hojas, y solo una en las anónimas", () => {
    const poll = days();
    const book = text(toXlsx(exportTable(poll, tally(poll, votes), null), COLORS, "22 de noviembre de 2026"));
    expect(book).toContain('<sheet name="Resultados"');
    expect(book).toContain('<sheet name="Votos"');
    expect(book).toContain('<sheet name="Participantes"');
    expect(book).toContain("exportada el 22 de noviembre de 2026");
    const anon = days({ anonymous: true });
    const one = text(toXlsx(exportTable(anon, tally(anon, votes), null), COLORS, "hoy"));
    expect(one).not.toContain('<sheet name="Votos"');
    expect(one).not.toContain("Bea");
  });

  it("escapa el texto y quita los caracteres que el XML no admite", () => {
    const book = text(buildXlsx([{ name: "Hoja", rows: [["<b>&" + String.fromCharCode(1)]] }], COLORS));
    expect(book).toContain("&lt;b&gt;&amp;</t>");
  });

  it("el PDF tiene una página por imagen y una tabla de referencias que cuadra", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = buildPdf([{ jpeg, width: 10, height: 10 }, { jpeg, width: 10, height: 10 }], "Cena de Navidad");
    const s = new TextDecoder("latin1").decode(pdf);
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(s).toContain("/Count 2");
    const xref = Number(s.match(/startxref\n(\d+)/)![1]);
    expect(s.slice(xref, xref + 4)).toBe("xref");
    // Cada objeto empieza donde dice la tabla.
    const offsets = [...s.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]));
    offsets.forEach((o, i) => expect(s.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });

  it("nombre del archivo", () => {
    expect(exportFileName("Cena de Navidad 🎄", "csv")).toMatch(/^cena-de-navidad-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(exportFileName("🎄", "pdf")).toMatch(/^votacion-/);
  });
});
