// Botón del creador: monta el mensaje con quién falta por votar y lo abre en el menú de compartir o en WhatsApp.
// Con un desempate abierto avisa a quien falta por elegir en el desempate, no en la votación cerrada.
import { plural, type Tally, type TiebreakTally } from "../lib/model";
import type { Poll } from "../lib/types";
import { canShareLink, shareLink } from "../lib/native";
import { Icon } from "./Icon";

const MAX_NAMES = 10; // en un mensaje de chat una lista más larga no se lee

function nameList(names: string[]) {
  const shown = names.slice(0, MAX_NAMES);
  const rest = names.length - shown.length;
  if (rest) return `${shown.join(", ")} y ${rest} más`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} y ${shown[shown.length - 1]}`;
}

export function RemindMissing({ poll, T, TB, open, me, url }: {
  poll: Poll; T: Tally; TB: TiebreakTally | null; open: boolean; me: string; url: string;
}) {
  const inTiebreak = !!TB && !TB.done;
  // Votación cerrada (o con el plazo acabado) y sin desempate abierto: ya no hay nada que votar.
  if (!open && !inTiebreak) return null;
  const tbVoted = inTiebreak ? new Set(Object.values(TB.voters).flat()) : null;
  const missing = T.people.filter(p => p.uid !== me && (tbVoted ? !tbVoted.has(p.uid) : !p.total));
  if (!missing.length) return null;
  // En las anónimas el mensaje va sin nombres, que acaba pegado en un grupo.
  const who = poll.anonymous ? plural(missing.length, ["persona", "personas"]) : nameList(missing.map(p => p.name));
  const where = inTiebreak ? `el desempate de «${poll.title}»` : `«${poll.title}»`;
  const text = `${missing.length === 1 ? "Falta" : "Faltan"} ${who} por votar en ${where}.`;
  return (
    <a className="btn small" target="_blank" rel="noopener" title="Avisar a quien falta"
      href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
      onClick={async e => {
        if (!canShareLink()) return;
        e.preventDefault();
        await shareLink({ title: poll.title, text, url });
      }}>
      <Icon name="megaphone" /> Avisar a quien falta
    </a>
  );
}
