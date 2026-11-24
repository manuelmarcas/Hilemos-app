// Campo de correos con burbujas («Solo estos correos»): cada correo, al terminarlo, se cierra en una burbuja que se
// puede quitar, y el siguiente se escribe a continuación. Un correo se da por terminado con Intro, coma, punto y
// coma, espacio, al salir del campo o al pegar una lista (sirve cualquier separador). Lo que no es un correo se queda
// escrito en el campo, marcado, para corregirlo.
//
// El texto a medio escribir (`draft`) también es del padre: al guardar, lo que quede sin cerrar cuenta (y si no es un
// correo, se avisa en vez de perderlo en silencio).
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { MAX_EMAIL, parseEmails } from "../lib/model";
import { bem } from "../lib/util";
import { Icon } from "./Icon";

const SEPARATOR = /[\s,;]/;

/** Correos ya cerrados y texto a medio escribir, juntos, como los lee parseEmails (validar y guardar). */
export const joinEmails = (emails: string[], draft: string) => [...emails, draft].filter(Boolean).join("\n");

/** Reparte un texto con correos en los cerrados (válidos) y lo que hay que corregir. */
export function splitEmails(text: string): { emails: string[]; draft: string } {
  const { emails, invalid } = parseEmails(text);
  return { emails, draft: invalid.join(" ") };
}

export function EmailChips({ id, emails, draft, onChange, placeholder, disabled, describedBy }: {
  id: string;
  emails: string[];
  draft: string;
  onChange: (emails: string[], draft: string) => void;
  placeholder?: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  // Se marca en rojo lo que se intentó cerrar y no era un correo (mientras se escribe, no).
  const [wrong, setWrong] = useState(false);

  /** Cierra en burbujas los correos válidos de `text`; lo demás se queda en el campo. `all`: también el último trozo. */
  function commit(text: string, all: boolean) {
    let rest = "";
    if (!all) {
      // Lo que va detrás del último separador se sigue escribiendo.
      const m = text.match(/^(.*[\s,;])([^\s,;]*)$/s);
      if (!m) { onChange(emails, text); setWrong(false); return; }
      [, text, rest] = m;
    }
    const { emails: found, invalid } = parseEmails(text);
    const next = [...emails, ...found.filter(e => !emails.includes(e))];
    const left = [...invalid, rest].filter(Boolean).join(" ");
    setWrong(invalid.length > 0);
    onChange(next, left);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Intro cierra el correo; no envía el formulario.
      e.preventDefault();
      if (draft.trim()) commit(draft, true);
    } else if (e.key === "Backspace" && !draft && emails.length) {
      // Borrar con el campo vacío devuelve el último correo al campo para corregirlo.
      e.preventDefault();
      onChange(emails.slice(0, -1), emails[emails.length - 1]);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!SEPARATOR.test(text.trim()) && !parseEmails(text).emails.length) return; // un trozo de correo: pegado normal
    e.preventDefault();
    commit(draft + " " + text, true);
  }

  const remove = (mail: string) => { onChange(emails.filter(x => x !== mail), draft); input.current?.focus(); };

  return (
    <div className={bem("email-chips", { disabled: !!disabled, wrong })} onClick={() => input.current?.focus()}>
      {emails.length > 0 && (
        <ul className="email-chips__list" aria-label="Correos añadidos">
          {emails.map(mail => (
            <li key={mail} className="email-chips__chip">
              <span className="email-chips__text">{mail}</span>
              <button type="button" className="email-chips__remove" aria-label={`Quitar ${mail}`} disabled={disabled}
                onClick={e => { e.stopPropagation(); remove(mail); }}><Icon name="close" /></button>
            </li>
          ))}
        </ul>
      )}
      <input maxLength={MAX_EMAIL} ref={input} id={id} className="email-chips__input" type="text" inputMode="email" enterKeyHint="enter"
        autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={disabled}
        aria-invalid={wrong} aria-describedby={describedBy}
        placeholder={emails.length ? "Añadir otro correo…" : placeholder}
        value={draft}
        onChange={e => {
          const v = e.target.value;
          // En el móvil la coma o el espacio no siempre llegan como tecla: se miran en el texto.
          if (SEPARATOR.test(v)) commit(v, false);
          else { onChange(emails, v); if (wrong) setWrong(false); }
        }}
        onKeyDown={onKeyDown} onPaste={onPaste}
        onBlur={() => { if (draft.trim()) commit(draft, true); }} />
    </div>
  );
}
