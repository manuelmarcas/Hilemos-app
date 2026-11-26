// Botón flotante del chat. Las pestañas (y con ellas el chat) quedan debajo del calendario: mientras no se ven, este
// botón lleva al chat de un toque y enseña cuántos mensajes hay sin leer. Desaparece en cuanto las pestañas se ven o
// ya se han dejado atrás (se está leyendo lo de debajo).
import { useEffect, useState } from "react";
import { plural } from "../../lib/model";
import { bem } from "../../lib/util";
import { Icon } from "../../components/Icon";

/** Botón flotante para ir al chat. `tabs`: las pestañas de la votación, para saber si se ven. */
export function ChatFab({ tabs, unread, onOpen }: { tabs: HTMLElement | null; unread: number; onOpen: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!tabs) return;
    // Solo cuando las pestañas quedan por debajo de la pantalla (top > 0): si quedan por encima, ya se ha bajado.
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(tabs);
    return () => io.disconnect();
  }, [tabs]);
  const label = unread ? `Ir al chat: ${plural(unread, ["mensaje sin leer", "mensajes sin leer"])}` : "Ir al chat";
  return (
    <button type="button" className={bem("fab", { hidden: !shown })} aria-label={label} data-tip="Ir al chat"
      aria-hidden={!shown} tabIndex={shown ? 0 : -1} onClick={onOpen}>
      <Icon name="chat" />
      {unread > 0 && <span className="fab__badge">{unread > 99 ? "99+" : unread}</span>}
    </button>
  );
}
