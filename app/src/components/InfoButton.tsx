// Botón ⓘ que abre una ventana con información. Sirve para quitar de la pantalla los textos que no hacen falta
// siempre: quien quiere saber más lo abre («Sobre esta votación», el máximo de personas al crear).
import { useRef, useState, type ReactNode } from "react";
import { bem, cls } from "../lib/util";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

/**
 * Botón ⓘ y su ventana. `label`: el nombre del botón para lectores de pantalla; `title`: el título de la ventana;
 * `small`: del tamaño del texto, para ir dentro de una frase o junto a una etiqueta; `dialogClass`: clase de la
 * ventana para el contenido propio.
 */
export function InfoButton({ label, title, small, dialogClass, children }: {
  label: string; title: string; small?: boolean; dialogClass?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dlg = useRef<HTMLDialogElement | null>(null);
  return <>
    <button type="button" className={bem("info-btn", { small })} aria-label={label} data-tip="Información"
      onClick={e => { e.preventDefault(); setOpen(true); }}><Icon name="info" /></button>
    {open && (
      <Dialog className={cls("dialog", dialogClass)} onClose={() => setOpen(false)} onOpen={d => { dlg.current = d; }}>
        <button className="dialog__close" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button>
        <h2 className="dialog__title">{title}</h2>
        {children}
      </Dialog>
    )}
  </>;
}
