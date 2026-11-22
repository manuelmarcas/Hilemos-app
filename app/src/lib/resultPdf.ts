// Informe de resultados en PDF (A4) para presentar o imprimir: cabecera, ganadora, clasificación con quién votó cada
// opción, desempate y participantes. Se dibuja en canvas con el tema claro (como la imagen del resultado, con sus
// fuentes y emojis) y cada página se guarda como imagen dentro del PDF (pdf.ts).
import { DISPLAY, LIGHT, SANS, clamp, drawBrand, fontsReady, lines, roundRect } from "./canvas";
import { exportTable, rankedRows, voterNames } from "./exportData";
import { plural, pollRange, unitLabel, type Tally, type TiebreakTally } from "./model";
import { publicHost } from "./native";
import { buildPdf } from "./pdf";
import type { Poll } from "./types";

// A4 a 150 puntos por pulgada.
const W = 1240;
const H = 1754;
const M = 96;
const BOTTOM = H - M - 48; // lo que queda por encima del pie
const INNER = W - M * 2;
const C = LIGHT;

const toJpeg = (cv: HTMLCanvasElement) => new Promise<Uint8Array>((resolve, reject) => {
  cv.toBlob(b => (b ? b.arrayBuffer().then(a => resolve(new Uint8Array(a)), reject) : reject(new Error("No se pudo generar el PDF."))),
    "image/jpeg", 0.92);
});

/** El informe de la votación en PDF. `exportedOn`: la fecha de hoy, en texto («22 de noviembre de 2026»). */
export async function resultPdf(poll: Poll, T: Tally, TB: TiebreakTally | null, exportedOn: string): Promise<Uint8Array<ArrayBuffer>> {
  const display = (await fontsReady()) ? DISPLAY : SANS;
  const t = exportTable(poll, T, TB);
  const pages: HTMLCanvasElement[] = [];
  let g!: CanvasRenderingContext2D;
  let y = 0;

  const newPage = () => {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("Este navegador no puede generar el PDF.");
    ctx.fillStyle = C["--card"];
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic";
    pages.push(cv);
    g = ctx;
    y = M;
  };
  // Pasa a otra página si lo que viene (de alto `h`) no cabe en esta.
  const room = (h: number) => { if (y + h > BOTTOM) newPage(); };
  const text = (s: string, x: number, font: string, color: string, align: CanvasTextAlign = "left") => {
    g.font = font;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(s, x, y);
    g.textAlign = "left";
  };
  const section = (title: string) => {
    room(140);
    y += 56;
    text(title, M, `800 34px ${display}`, C["--brand-strong"]);
    y += 22;
    g.fillStyle = C["--line"];
    g.fillRect(M, y, INNER, 2);
    y += 34;
  };

  newPage();

  // ---------- Cabecera ----------
  drawBrand(g, M, M - 4, 56, C);
  y += 74;
  g.font = `800 56px ${display}`;
  for (const l of lines(g, poll.title, INNER, 3)) {
    y += 62;
    text(l, M, `800 56px ${display}`, C["--ink"]);
  }
  y += 6;
  g.font = `600 24px ${SANS}`;
  for (const l of lines(g, `${t.meta} · exportada el ${exportedOn}`, INNER, 2)) {
    y += 36;
    text(l, M, `600 24px ${SANS}`, C["--muted"]);
  }
  if (poll.description) {
    g.font = `400 26px ${SANS}`;
    for (const l of lines(g, poll.description, INNER, 6)) {
      y += 38;
      text(l, M, `400 26px ${SANS}`, C["--ink"]);
    }
  }
  g.font = `400 24px ${SANS}`;
  for (const l of lines(g, pollRange(poll), INNER, 2)) {
    y += 36;
    text(l, M, `400 24px ${SANS}`, C["--muted"]);
  }
  y += 20;

  // ---------- Ganadora o empate ----------
  const win = t.rows.find(r => r.winner);
  if (win || T.leaders.length > 1) {
    y += 32;
    const h = 120;
    g.fillStyle = win ? C["--best-soft"] : C["--tie-soft"];
    roundRect(g, M, y, INNER, h, 22);
    g.fill();
    if (win) {
      g.strokeStyle = C["--best"];
      g.lineWidth = 3;
      g.stroke();
    }
    const top = y;
    y = top + 46;
    text(win ? (TB ? "Ganadora del desempate" : "La más votada") : "Empate", M + 32, `800 22px ${SANS}`, win ? C["--best"] : C["--tie-ink"]);
    y = top + 88;
    const votes = win ? plural(TB ? win.tb || 0 : win.votes, ["voto", "votos"]) : "";
    g.font = `800 28px ${SANS}`;
    const vw = votes ? g.measureText(votes).width + 24 : 0;
    g.font = `700 32px ${SANS}`;
    const what = win ? unitLabel(poll, win.key) : `${T.leaders.length} opciones empatadas en el primer puesto`;
    text(clamp(g, what, INNER - 64 - vw), M + 32, `700 32px ${SANS}`, C["--ink"]);
    if (votes) text(votes, M + INNER - 32, `800 28px ${SANS}`, win ? C["--best"] : C["--muted"], "right");
    y = top + h;
  }

  // ---------- Clasificación ----------
  section("Clasificación");
  const ranked = rankedRows(t).filter(r => r.votes > 0);
  if (!ranked.length) {
    y += 10;
    text("Todavía no hay votos.", M, `600 26px ${SANS}`, C["--muted"]);
  }
  const max = ranked[0]?.votes || 1;
  const labelX = M + 88;
  for (const r of ranked) {
    g.font = `400 22px ${SANS}`;
    const names = t.anonymous ? [] : lines(g, voterNames(t, r).join(", "), INNER - 88, 3);
    const h = 70 + names.length * 30 + 18;
    room(h);
    const top = y;
    const first = r.rank === 1;
    g.fillStyle = first ? C["--best"] : C["--soft"];
    roundRect(g, M, top, 64, 44, 22);
    g.fill();
    y = top + 31;
    text(`${r.rank}º`, M + 32, `800 22px ${SANS}`, first ? C["--on-best"] : C["--muted"], "center");
    const votes = plural(r.votes, ["voto", "votos"]);
    g.font = `800 26px ${SANS}`;
    const vw = g.measureText(votes).width;
    g.font = `700 27px ${SANS}`;
    text(clamp(g, unitLabel(poll, r.key), INNER - 88 - vw - 24), labelX, `700 27px ${SANS}`, C["--ink"]);
    text(votes, M + INNER, `800 26px ${SANS}`, first ? C["--best"] : C["--muted"], "right");
    // Barra proporcional a los votos de la más votada.
    g.fillStyle = C["--soft"];
    roundRect(g, labelX, top + 50, INNER - 88, 10, 5);
    g.fill();
    g.fillStyle = first ? C["--best"] : C["--brand"];
    roundRect(g, labelX, top + 50, Math.max(10, (INNER - 88) * (r.votes / max)), 10, 5);
    g.fill();
    y = top + 70;
    for (const l of names) {
      y += 30;
      text(l, labelX, `400 22px ${SANS}`, C["--muted"]);
    }
    y = top + h;
  }

  // ---------- Desempate ----------
  if (TB) {
    section(TB.done ? (TB.leaders.length === 1 ? "Desempate (finalizado)" : "Desempate (sin ganadora)") : "Desempate (abierto)");
    const cands = [...TB.candidates].sort((a, b) => (TB.counts[b] || 0) - (TB.counts[a] || 0));
    for (const key of cands) {
      room(48);
      y += 36;
      const votes = plural(TB.counts[key] || 0, ["voto", "votos"]);
      g.font = `800 24px ${SANS}`;
      const vw = g.measureText(votes).width;
      g.font = `600 26px ${SANS}`;
      text(clamp(g, unitLabel(poll, key), INNER - vw - 24), M, `600 26px ${SANS}`, C["--ink"]);
      text(votes, M + INNER, `800 24px ${SANS}`, C["--muted"], "right");
      y += 12;
    }
  }

  // ---------- Participantes (en dos columnas) ----------
  if (!t.anonymous && t.people.length) {
    const present = t.people.filter(p => !p.gone);
    section(`Participantes (${present.length})`);
    const people = [...present, ...t.people.filter(p => p.gone)];
    const GAP = 72;
    const colW = (INNER - GAP) / 2;
    for (let i = 0; i < people.length; i += 2) {
      room(44);
      y += 34;
      people.slice(i, i + 2).forEach((p, k) => {
        const x = M + k * (colW + GAP);
        const extra = [p.role, p.gone ? "se fue" : "", plural(p.total, ["casilla", "casillas"])].filter(Boolean).join(" · ");
        g.font = `400 22px ${SANS}`;
        const ew = g.measureText(extra).width;
        g.font = `600 25px ${SANS}`;
        const name = clamp(g, p.name, colW - ew - 16);
        text(name, x, `600 25px ${SANS}`, p.gone ? C["--muted"] : C["--ink"]);
        text(extra, x + colW, `400 22px ${SANS}`, C["--muted"], "right");
      });
      y += 10;
    }
  }

  // ---------- Pie de cada página ----------
  pages.forEach((cv, i) => {
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = C["--line"];
    ctx.fillRect(M, H - M - 18, INNER, 2);
    ctx.font = `600 20px ${SANS}`;
    ctx.fillStyle = C["--muted"];
    ctx.textAlign = "left";
    ctx.fillText(`Hilemos · ${publicHost()}`, M, H - M + 16);
    ctx.textAlign = "right";
    ctx.fillText(`Página ${i + 1} de ${pages.length}`, M + INNER, H - M + 16);
  });

  const jpegs = await Promise.all(pages.map(toJpeg));
  return buildPdf(jpegs.map(jpeg => ({ jpeg, width: W, height: H })), poll.title);
}
