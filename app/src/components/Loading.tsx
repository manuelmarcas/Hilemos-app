// Señales de que algo se está cargando o esperando (design-system/README.md, «Cargando»):
// - Spinner: el círculo que gira, dentro de un botón mientras espera («Entrando con Google…») o junto a un texto.
// - Loading: una pantalla o una zona que se carga: el círculo y el texto debajo, centrados.
// - PollListSkeleton: la lista de votaciones mientras llega, con la forma de las tarjetas.
// - PollSkeleton: una votación mientras llega, con la forma de la cabecera y del calendario.
import type { ReactNode } from "react";
import { cls } from "../lib/util";

/** Círculo que gira (decorativo: el texto de al lado dice qué pasa). Toma el tamaño de `--spinner-size`. */
export function Spinner({ className }: { className?: string }) {
  return <span className={cls("spinner", className)} aria-hidden="true" />;
}

/** Zona que se está cargando: círculo y texto, anunciado a los lectores de pantalla. */
export function Loading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cls("loading", className)} role="status">
      <Spinner />
      <span>{children}</span>
    </div>
  );
}

/** Cuántas casillas tiene el calendario vacío del esqueleto de una votación (5 semanas). */
const SKELETON_CELLS = 35;

/** Una votación mientras llega: la cabecera y un calendario vacíos, con el mismo brillo que la lista. */
export function PollSkeleton({ label }: { label: string }) {
  return (
    <div className="skeleton" role="status" aria-label={label}>
      <div className="skeleton__head">
        <span className="skeleton__line" />
        <span className="skeleton__line skeleton__line--heading" />
      </div>
      <div className="skeleton__card skeleton__card--board">
        {Array.from({ length: SKELETON_CELLS }, (_, i) => <span key={i} className="skeleton__cell" />)}
      </div>
    </div>
  );
}

/** Tarjetas vacías con un brillo que pasa, con la forma de la lista de votaciones. */
export function PollListSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="skeleton" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton__card">
          <span className="skeleton__icon" />
          <span className="skeleton__lines">
            <span className="skeleton__line skeleton__line--title" />
            <span className="skeleton__line" />
          </span>
        </div>
      ))}
    </div>
  );
}
