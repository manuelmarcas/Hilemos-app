// «Exportar resultados»: genera el archivo en el formato elegido y lo guarda (o, en la app, lo comparte).
// El PDF (lo que más pesa) se carga solo al pedirlo.
import * as D from "./dates";
import { LIGHT } from "./canvas";
import { exportFileName, exportTable, toCsv, toXlsx } from "./exportData";
import { saveFile } from "./files";
import type { Tally, TiebreakTally } from "./model";
import type { Poll } from "./types";

export type ExportFormat = "csv" | "xlsx" | "pdf";

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/** «22 de noviembre de 2026». */
const today = () => `${D.fmtDayPlain(D.todayKey())} de ${new Date().getFullYear()}`;

async function build(poll: Poll, T: Tally, TB: TiebreakTally | null, format: ExportFormat): Promise<BlobPart> {
  if (format === "csv") return toCsv(exportTable(poll, T, TB));
  if (format === "xlsx") {
    return toXlsx(exportTable(poll, T, TB), {
      head: LIGHT["--soft"], best: LIGHT["--best-soft"], brand: LIGHT["--brand-strong"], muted: LIGHT["--muted"], line: LIGHT["--line"],
    }, today());
  }
  const { resultPdf } = await import("./resultPdf");
  return resultPdf(poll, T, TB, today());
}

/** Genera y guarda la exportación. «shared» en la app (menú de compartir) y «downloaded» en el navegador. */
export async function exportResults(poll: Poll, T: Tally, TB: TiebreakTally | null, format: ExportFormat) {
  const blob = new Blob([await build(poll, T, TB, format)], { type: MIME[format] });
  return saveFile(blob, exportFileName(poll.title, format), poll.title);
}
