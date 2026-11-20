// Botón de emoji (carita) que acompaña a un campo de texto: inserta emojis en la posición del cursor.
import { useUi } from "../state/ui";
import { Icon } from "./Icon";

export function EmojiButton({ field, setValue }: {
  field: () => HTMLInputElement | HTMLTextAreaElement | null;
  setValue: (v: string) => void;
}) {
  const { openEmoji } = useUi();
  return (
    <button type="button" className="emoji-btn" aria-label="Añadir emoji" aria-expanded="false"
      onClick={e => {
        const anchor = e.currentTarget;
        openEmoji({
          anchor,
          keepOpen: true, // se pueden poner varios seguidos
          onPick: emoji => {
            const el = field();
            if (!el) return;
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? el.value.length;
            const next = el.value.slice(0, start) + emoji + el.value.slice(end);
            if (el.maxLength > 0 && next.length > el.maxLength) return;
            setValue(next);
            const pos = start + emoji.length;
            requestAnimationFrame(() => { try { el.setSelectionRange(pos, pos); } catch { /* nada */ } });
          },
        });
      }}><Icon name="smile" /></button>
  );
}
