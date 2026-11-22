// Guardar un archivo generado en el dispositivo (calendario, imagen del resultado, exportaciones).
import { shareFileNative } from "./native";

/** Descarga el archivo en el navegador. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); // revocarlo antes de que el navegador lo lea cancela la descarga
}

/**
 * Guarda un archivo: en la app, con el menú de compartir (allí las descargas no funcionan, y desde ese menú se
 * puede guardar o mandar); en el navegador, lo descarga.
 */
export async function saveFile(blob: Blob, name: string, title: string): Promise<"shared" | "downloaded"> {
  if (await shareFileNative(blob, name, title)) return "shared";
  downloadBlob(blob, name);
  return "downloaded";
}
