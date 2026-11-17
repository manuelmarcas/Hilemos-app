// Botón del creador: monta el mensaje con quién falta por votar y lo abre en el menú de compartir o en WhatsApp.
import { plural, type Tally } from "../lib/model";
import type { Poll } from "../lib/types";

const MAX_NAMES = 10; // en un mensaje de chat una lista más larga no se lee

function nameList(names: string[]) {
  const shown = names.slice(0, MAX_NAMES);
  const rest = names.length - shown.length;
  if (rest) return `${shown.join(", ")} y ${rest} más`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} y ${shown[shown.length - 1]}`;
}

export function RemindMissing({ poll, T, me, url }: { poll: Poll; T: Tally; me: string; url: string }) {
  const missing = T.people.filter(p => !p.total && p.uid !== me);
  if (!missing.length) return null;
  // En las anónimas el mensaje va sin nombres, que acaba pegado en un grupo.
  const who = poll.anonymous ? plural(missing.length, ["persona", "personas"]) : nameList(missing.map(p => p.name));
  const text = `${missing.length === 1 ? "Falta" : "Faltan"} ${who} por votar en «${poll.title}».`;
  return (
    <a className="btn small" target="_blank" rel="noopener" title="Avisar a quien falta"
      href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
      onClick={async e => {
        if (typeof navigator.share !== "function") return;
        e.preventDefault();
        try { await navigator.share({ title: poll.title, text, url }); } catch { /* cancelado */ }
      }}>
      <span aria-hidden="true">📣</span> Avisar a quien falta
    </a>
  );
}
