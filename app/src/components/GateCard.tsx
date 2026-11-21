// Tarjeta de las pantallas sin sesión (entrada y enlace del correo): logotipo y nombre, y debajo lo que se pase.
import type { ReactNode } from "react";
import { LogoMark } from "./LogoMark";

export function GateCard({ children }: { children: ReactNode }) {
  return (
    <div id="gate">
      <div className="gate-card">
        <LogoMark className="gate-logo" size={72} />
        <h1><span className="wm-hile">Hile</span><span className="wm-mos">mos</span></h1>
        {children}
      </div>
    </div>
  );
}
