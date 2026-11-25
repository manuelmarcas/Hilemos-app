// Pestañas bajo el calendario: «Más votadas», «Participantes» y «Chat» (con los mensajes sin leer).
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { plural } from "../../lib/model";
import { Icon, type IconName } from "../../components/Icon";

export type PollTab = "summary" | "people" | "chat";

const TABS: { id: PollTab; icon: IconName; label: string }[] = [
  { id: "summary", icon: "trophy", label: "Más votadas" },
  { id: "people", icon: "users", label: "Participantes" },
  { id: "chat", icon: "chat", label: "Chat" },
];

// El calendario queda siempre arriba; debajo se alterna lo demás para que la pantalla no se haga eterna.
export function PollTabs({ tab, setTab, counts, unread, tabsRef }: {
  tab: PollTab; setTab: (t: PollTab) => void; counts: Partial<Record<PollTab, number>>; unread: number;
  /** Recibe la fila de pestañas (el botón flotante del chat mira si se ve). */
  tabsRef?: (el: HTMLDivElement | null) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex(t => t.id === tab);
    const j = (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[j].id);
    refs.current[j]?.focus();
  }
  return (
    <div ref={tabsRef} className="poll-tabs" role="tablist" aria-label="Qué ver debajo del calendario" onKeyDown={onKey}>
      {TABS.map((t, i) => {
        const on = tab === t.id, n = counts[t.id];
        const badge = t.id === "chat" && unread > 0 ? unread : 0;
        return (
          <button key={t.id} ref={el => { refs.current[i] = el; }} type="button" role="tab" id={`ptabbtn-${t.id}`}
            className="poll-tabs__tab" aria-selected={on} aria-controls={`ptab-${t.id}`} tabIndex={on ? 0 : -1} onClick={() => setTab(t.id)}
            aria-label={badge ? `${t.label}: ${plural(badge, ["mensaje sin leer", "mensajes sin leer"])}` : undefined}>
            <span className={badge > 0 ? "poll-tabs__icon poll-tabs__icon--badge" : "poll-tabs__icon"} aria-hidden="true">
              <Icon name={t.icon} />{badge > 0 && <span className="poll-tabs__badge">{badge > 99 ? "99+" : badge}</span>}
            </span>
            <span className="poll-tabs__label">{t.label}{n != null && <span className="poll-tabs__count">{n}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}
