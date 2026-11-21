// Tarjeta de las pantallas sin sesión (entrada y enlace del correo): logotipo y nombre, y debajo lo que se pase.
import type { ReactNode } from "react";
import { LogoMark } from "./LogoMark";

/** `footer`: debajo de la tarjeta (en la entrada, los enlaces a la privacidad y las condiciones). */
export function GateCard({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div id="gate">
      <div className="gate-card">
        <LogoMark className="gate-logo" size={72} />
        <h1><span className="wm-hile">Hile</span><span className="wm-mos">mos</span></h1>
        {children}
      </div>
      {footer}
    </div>
  );
}
