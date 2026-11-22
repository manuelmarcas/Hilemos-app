// Logotipo sin fondo de la barra superior y la pantalla de entrada: el calendario en
// `color` (currentColor, que es `--logo`), con los ojos, la sonrisa y la lengua encima
// en su color. Es design-system/logo/logo-lila.svg con el lila pasado a currentColor.

import { LOGO_BOX, LOGO_EYE, LOGO_PATHS } from "../lib/logo";

/** `eyeClassName` va en el ojo abierto: así quien lo usa puede animarlo (al arrancar, gira como un círculo de carga). */
export function LogoMark({ size = 34, className, eyeClassName }: { size?: number; className?: string; eyeClassName?: string }) {
  return (
    <svg className={className} viewBox={LOGO_BOX.join(" ")} width={size} height={size} aria-hidden="true" focusable="false">
      {LOGO_PATHS.map(([fill, d], i) => (
        <path key={i} d={d} fill={fill ?? "currentColor"} className={i === LOGO_EYE ? eyeClassName : undefined} />
      ))}
    </svg>
  );
}
