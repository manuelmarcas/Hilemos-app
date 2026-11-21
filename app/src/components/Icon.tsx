// Iconos propios de la interfaz (SVG de trazo, 24×24, esquinas redondeadas y color del texto que los rodea).
// Los emojis se quedan para lo que escribe la gente: títulos, chat y el icono de cada opción del día.
import type { ReactNode } from "react";

const dot = (cx: number, cy: number, r = 1.1) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
// Calendario base: el mismo contorno redondeado con dos anillas que el logotipo.
const cal = (inner: ReactNode) => <>
  <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
  <path d="M8 3v4M16 3v4M3.5 10h17" />
  {inner}
</>;
const bellPath = "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21a2.2 2.2 0 0 0 4 0";

const ICONS = {
  // Navegación y menús
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  more: <>{dot(6, 12, 1.6)}{dot(12, 12, 1.6)}{dot(18, 12, 1.6)}</>,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,

  // Tipos de votación
  hours: <><circle cx="12" cy="12.5" r="8.5" /><path d="M12 8v4.5l3 2M5 3.5 3 5.5M19 3.5l2 2" /></>,
  days: cal(<rect x="10" y="13" width="4" height="4" rx="1.2" fill="currentColor" stroke="none" />),
  weeks: cal(<rect x="6.5" y="13.2" width="11" height="3.6" rx="1.4" fill="currentColor" stroke="none" />),
  months: cal(<>{dot(8, 13.5)}{dot(12, 13.5)}{dot(16, 13.5)}{dot(8, 17)}{dot(12, 17)}{dot(16, 17)}</>),
  calendarAdd: cal(<path d="M12 12.5v5M9.5 15h5" />),
  vote: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.5l2.5 2.5 4.5-5.5" /></>,

  // Compartir y comunicar
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  share: <path d="M12 3.5v11M8 7.5l4-4 4 4M5 12v6a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18v-6" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="3.5" /><circle cx="9" cy="9.5" r="1.8" /><path d="M4 18l5-5 4 4 2.5-2.5L20 19" /></>,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  megaphone: <path d="M4 10h3l9-5v14l-9-5H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zM7 14l1.5 5.5H11l-1-5M19.5 9.5a3.5 3.5 0 0 1 0 5" />,
  chat: <><path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z" />{dot(8.5, 12)}{dot(12, 12)}{dot(15.5, 12)}</>,
  send: <path d="M21 3 10 14M21 3l-6.5 18-4.5-7-7-4.5z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7.5l8 6 8-6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" /></>,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M14 9.8h2.5" />{dot(9, 10, 1.2)}</>,

  // Gestión
  archive: <><rect x="3" y="4" width="18" height="5" rx="1.8" /><path d="M5 9v9a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V9M10 13h4" /></>,
  unarchive: <><rect x="3" y="4" width="18" height="5" rx="1.8" /><path d="M5 9v9a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V9M12 18v-5.5M9.5 15l2.5-2.5 2.5 2.5" /></>,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" />,
  leave: <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M9.5 12H20M16 8l4 4-4 4" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></>,
  unlock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 7.8-1.3M12 14.5v2" /></>,
  settings: <><path d="M4 7h9M18 7h2M4 17h2M11 17h9" /><circle cx="15.5" cy="7" r="2.5" /><circle cx="8.5" cy="17" r="2.5" /></>,
  key: <><circle cx="8" cy="15.5" r="4.5" /><path d="M11.2 12.3 20 3.5M16.5 7l2.5 2.5M14 9.5l2 2" /></>,
  hourglass: <path d="M7 3.5h10M7 20.5h10M8 3.5v3a4 4 0 0 0 1.6 3.2L12 12l2.4-2.3A4 4 0 0 0 16 6.5v-3M8 20.5v-3a4 4 0 0 1 1.6-3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2v3" />,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></>,

  // Personas y votos
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></>,
  approve: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15.5 11.5l2 2 4-4.5" /></>,
  eye: <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></>,
  incognito: <path d="M3 3l18 18M10.6 5.1Q11.3 5 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.9 3.9M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v7M8.5 20h7" />,
  scale: <path d="M12 3.5V20M7.5 20h9M4.5 7h15M4.5 7 2 13a2.5 2.5 0 0 0 5 0zM19.5 7 17 13a2.5 2.5 0 0 0 5 0z" />,

  // Perfil y preferencias
  camera: <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  bell: <path d={bellPath} />,
  bellOff: <path d={bellPath + "M3 3l18 18"} />,
  themeAuto: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

/** Icono de la interfaz. Decorativo (aria-hidden): el texto de al lado, o el aria-label del botón, lo nombra. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className ? `ic ${className}` : "ic"} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}
