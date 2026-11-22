// Menús desplegables de la votación: «Añadir al calendario» y el menú ⋯ de quien la administra.
import { useRef, useState } from "react";
import { downloadIcs, googleCalendarUrl, type CalEvent } from "../../lib/ics";
import { isAndroid, isIos } from "../../lib/util";
import { useMenuKeys } from "../../hooks/useDismiss";
import { Icon } from "../../components/Icon";

// Un solo botón para el calendario, según el dispositivo: en Android abre Google Calendar (sin descargar nada),
// en iPhone y iPad descarga el .ics, que abre Calendario directamente, y en el ordenador deja elegir con un menú.
export function CalendarMenu({ cal }: { cal: CalEvent }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useMenuKeys(open, setOpen, wrap, btn);
  const label = <><Icon name="calendarAdd" /> Añadir al calendario</>;
  if (isAndroid()) {
    return <a className="btn btn--small" href={googleCalendarUrl(cal)} target="_blank" rel="noopener noreferrer">{label}</a>;
  }
  if (isIos()) return <button className="btn btn--small" onClick={() => downloadIcs(cal)}>{label}</button>;
  return (
    <div className="menu" ref={wrap}>
      <button ref={btn} className="btn btn--small" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {label} <span className="menu__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="menu__list menu__list--start" role="menu" aria-label="Añadir al calendario">
          <a role="menuitem" className="menu__item" href={googleCalendarUrl(cal)} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}>
            <Icon name="globe" />Google Calendar
          </a>
          <button role="menuitem" className="menu__item" onClick={() => { setOpen(false); downloadIcs(cal); }}>
            <Icon name="download" />Apple, Outlook y otros (.ics)
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Menú ⋯ junto al título, para quien administra la votación: editarla, cerrar o reabrir (sin `onCloseOrReopen`, con
 * el resultado ya definitivo, no se ofrece), acceso y plazas, hacerla anónima, duplicarla y (solo el creador,
 * `onDelete`) eliminarla.
 */
export function OwnerMenu({ closed, anonymous, onCloseOrReopen, onEdit, onAnon, onDelete, onDuplicate, onAccess }: {
  closed: boolean; anonymous: boolean; onCloseOrReopen?: () => void; onEdit: () => void; onAnon: () => void;
  onDelete?: () => void; onDuplicate: () => void; onAccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useMenuKeys(open, setOpen, wrap, btn);

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="menu" ref={wrap}>
      <button ref={btn} className="menu__btn" aria-haspopup="menu" aria-expanded={open} aria-label="Opciones de la votación"
        data-tip="Opciones de la votación" onClick={() => setOpen(o => !o)}><Icon name="more" /></button>
      {open && (
        <div className="menu__list" role="menu" aria-label="Opciones de la votación">
          <button role="menuitem" className="menu__item" onClick={pick(onEdit)}>
            <Icon name="edit" />Editar votación
          </button>
          {onCloseOrReopen && (
            <button role="menuitem" className="menu__item" onClick={pick(onCloseOrReopen)}>
              <Icon name={closed ? "unlock" : "lock"} />{closed ? "Reabrir votación" : "Cerrar votación"}
            </button>
          )}
          {onAccess && (
            <button role="menuitem" className="menu__item" onClick={pick(onAccess)}>
              <Icon name="settings" />Acceso y plazas
            </button>
          )}
          {!anonymous && (
            <button role="menuitem" className="menu__item" onClick={pick(onAnon)}>
              <Icon name="incognito" />Hacer anónima
            </button>
          )}
          <button role="menuitem" className="menu__item" onClick={pick(onDuplicate)}>
            <Icon name="copy" />Duplicar votación
          </button>
          {onDelete && <>
            <div className="menu__sep" role="separator" />
            <button role="menuitem" className="menu__item menu__item--danger" onClick={pick(onDelete)}>
              <Icon name="trash" />Eliminar votación
            </button>
          </>}
        </div>
      )}
    </div>
  );
}
