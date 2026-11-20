// Tarjeta de resultados en PNG (1080×1080) para compartir en un grupo.
import * as D from "./dates";
import { publicHost, shareFileNative } from "./native";
import { TYPE, plural, slotLabel, unitParts } from "./model";
import type { Poll, PollData } from "./types";
import type { Tally, TiebreakTally } from "./model";

const SIZE = 1080;
const PAD = 112;
const DISPLAY = '"Bricolage Grotesque", system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
const SANS = 'Figtree, system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';

// Valores del tema claro por si la hoja de estilos no está disponible al dibujar.
const FALLBACK: Record<string, string> = {
  "--bg": "#f6f4f7", "--card": "#ffffff", "--soft": "#eeeaef", "--line": "#e2dde4",
  "--ink": "#2a1f27", "--muted": "#6b5e66", "--brand": "#5e2a59", "--brand-strong": "#451d42",
  "--best": "#1e7a45", "--best-soft": "#e5f2ea", "--on-best": "#ffffff",
  "--tie-soft": "#fff3d1", "--tie-ink": "#7a5a0b",
};

function theme() {
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string) => cs.getPropertyValue(name).trim() || FALLBACK[name];
  return Object.fromEntries(Object.keys(FALLBACK).map(k => [k, read(k)])) as Record<string, string>;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function clamp(g: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (g.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s && g.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1).trimEnd();
  return `${s}…`;
}

function lines(g: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  let left = 0;
  for (const [i, w] of words.entries()) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    out.push(line);
    line = w;
    if (out.length === maxLines) { left = words.length - i; break; }
  }
  if (out.length < maxLines && line) out.push(line);
  const last = out.length - 1;
  return out.map((l, i) => clamp(g, i === last && left > 0 ? `${l}…` : l, maxWidth));
}

interface Row { rank: number; what: string; votes: number; tbWinner: boolean }

function rowsOf(poll: PollData, T: Tally, TB: TiebreakTally | null): Row[] {
  const tbWinner = TB?.done && TB.leaders.length === 1 ? TB.leaders[0] : null;
  const tag = (optIcon: string, optName: string) =>
    poll.type === "days" ? `${optIcon} ${optName}`.trim() : TYPE[poll.type].emoji;
  return T.top.slice(0, 3).map(e => ({
    rank: e.rank,
    what: `${tag(e.opt.icon, e.opt.name)} ${slotLabel(poll, e.slot)}`.trim(),
    votes: e.votes,
    tbWinner: e.key === tbWinner,
  }));
}

// Con el desempate finalizado, la ganadora puede no estar entre las tres primeras del recuento general.
function tbRow(poll: PollData, T: Tally, TB: TiebreakTally | null): Row | null {
  if (!TB?.done || TB.leaders.length !== 1) return null;
  const key = TB.leaders[0];
  const { slot, optId } = unitParts(key);
  const opt = T.opts.find(o => o.id === optId);
  const label = poll.type === "days" && opt ? `${opt.icon} ${opt.name}`.trim() : TYPE[poll.type].emoji;
  return { rank: 1, what: `${label} ${slotLabel(poll, slot)}`.trim(), votes: TB.counts[key] || 0, tbWinner: true };
}

async function fonts() {
  try {
    await document.fonts.ready;
    return document.fonts.check(`800 68px "Bricolage Grotesque"`);
  } catch {
    return false;
  }
}

export async function resultCard(poll: Poll, T: Tally, TB: TiebreakTally | null): Promise<Blob> {
  const ok = await fonts();
  const display = ok ? DISPLAY : SANS;
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const g = c.getContext("2d");
  if (!g) throw new Error("Este navegador no puede generar la imagen.");
  const t = theme();

  g.fillStyle = t["--bg"];
  g.fillRect(0, 0, SIZE, SIZE);
  g.fillStyle = t["--card"];
  roundRect(g, 48, 48, SIZE - 96, SIZE - 96, 44);
  g.fill();
  g.strokeStyle = t["--line"];
  g.lineWidth = 2;
  g.stroke();

  const inner = SIZE - PAD * 2;
  let y = PAD + 24;

  g.textBaseline = "alphabetic";
  g.fillStyle = t["--brand-strong"];
  g.font = `800 40px ${display}`;
  g.fillText("Hilemos", PAD, y);
  y += 56;

  const info = TYPE[poll.type];
  const meta = [`${info.emoji} Votación por ${info.name.toLowerCase()}`, plural(T.people.length, ["participante", "participantes"])];
  if (poll.closed) meta.push("cerrada");
  g.fillStyle = t["--muted"];
  g.font = `600 28px ${SANS}`;
  g.fillText(clamp(g, meta.join(" · "), inner), PAD, y);
  y += 72;

  const titleSize = poll.title.length > 60 ? 52 : poll.title.length > 32 ? 60 : 68;
  g.fillStyle = t["--brand-strong"];
  g.font = `800 ${titleSize}px ${display}`;
  for (const line of lines(g, poll.title, inner, 3)) {
    y += titleSize;
    g.fillText(line, PAD, y);
    y += 10;
  }
  y += 36;

  const footerY = SIZE - PAD + 8;
  const winner = tbRow(poll, T, TB);
  const list = winner ? [winner, ...rowsOf(poll, T, TB).filter(r => !r.tbWinner).slice(0, 2)] : rowsOf(poll, T, TB);

  if (!list.length) {
    g.fillStyle = t["--soft"];
    roundRect(g, PAD, y, inner, 128, 24);
    g.fill();
    g.fillStyle = t["--muted"];
    g.font = `600 32px ${SANS}`;
    g.fillText("Todavía no hay votos.", PAD + 40, y + 78);
  }

  const gap = 20;
  const avail = footerY - 56 - y;
  const shown = list.slice(0, Math.max(1, Math.min(list.length, Math.floor((avail + gap) / (140 + gap)))));
  for (const [i, row] of shown.entries()) {
    const h = row.tbWinner ? 164 : 140;
    const first = i === 0;
    g.fillStyle = first ? t["--best-soft"] : t["--soft"];
    roundRect(g, PAD, y, inner, h, 24);
    g.fill();
    if (first) {
      g.strokeStyle = t["--best"];
      g.lineWidth = 3;
      g.stroke();
    }

    g.fillStyle = first ? t["--best"] : t["--card"];
    roundRect(g, PAD + 28, y + (h - 60) / 2, 72, 60, 30);
    g.fill();
    g.fillStyle = first ? t["--on-best"] : t["--muted"];
    g.font = `800 30px ${SANS}`;
    g.textAlign = "center";
    g.fillText(`${row.rank}º`, PAD + 64, y + h / 2 + 11);

    g.textAlign = "right";
    g.font = `800 32px ${SANS}`;
    g.fillStyle = first ? t["--best"] : t["--muted"];
    const votes = plural(row.votes, ["voto", "votos"]);
    g.fillText(votes, PAD + inner - 36, y + h / 2 + 11);
    const votesW = g.measureText(votes).width;

    g.textAlign = "left";
    const textX = PAD + 124;
    const textW = inner - 124 - votesW - 96;
    g.fillStyle = t["--ink"];
    g.font = `700 36px ${SANS}`;
    const textY = row.tbWinner ? y + h / 2 - 8 : y + h / 2 + 13;
    g.fillText(clamp(g, row.what, textW), textX, textY);

    if (row.tbWinner) {
      g.font = `700 24px ${SANS}`;
      const badge = "⚖️ Ganó el desempate";
      const bw = g.measureText(badge).width + 36;
      g.fillStyle = t["--tie-soft"];
      roundRect(g, textX, textY + 20, bw, 44, 22);
      g.fill();
      g.fillStyle = t["--tie-ink"];
      g.fillText(badge, textX + 18, textY + 50);
    }
    y += h + gap;
  }

  g.textAlign = "left";
  g.fillStyle = t["--muted"];
  g.font = `600 26px ${SANS}`;
  g.fillText(clamp(g, `Vota tú también en ${publicHost()}`, inner), PAD, footerY);

  return new Promise<Blob>((resolve, reject) => {
    c.toBlob(b => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))), "image/png");
  });
}

const slugFile = (s: string) => (s || "votacion").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "votacion";

/** Comparte la tarjeta y, si el navegador no puede, la descarga (en la app siempre se comparte). */
export async function shareResultCard(poll: Poll, T: Tally, TB: TiebreakTally | null): Promise<"shared" | "downloaded"> {
  const blob = await resultCard(poll, T, TB);
  const name = `resultado-${slugFile(poll.title)}-${D.todayKey()}.png`;
  if (await shareFileNative(blob, name, poll.title, `Resultado de «${poll.title}»`)) return "shared";
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: poll.title, text: `Resultado de «${poll.title}»` });
      return "shared";
    } catch (e) {
      // Cancelado por la persona: no hay que descargar nada a su espalda.
      if ((e as DOMException)?.name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
