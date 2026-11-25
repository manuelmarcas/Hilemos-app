// Chat de una votación: la conversación que antes se iba al grupo de WhatsApp y allí se perdía. Además de los
// mensajes, los avisos de los cambios que hace un administrador al editar la votación (sys).
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import * as D from "../lib/dates";
import { MAX_CHAT, MAX_REPORT_COMMENT, REPORT_REASONS, chatSince, isPresent, reportsByMessage, sysTextFor } from "../lib/model";
import type { ChatMessage, ChatReport, Poll, ReportReason, Votes } from "../lib/types";
import { bem, cls, errMsg, hasMouse } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { useAutoGrow } from "../hooks/useAutoGrow";
import { usePageVisible } from "../hooks/usePageVisible";
import { ReportDialog } from "./ReportDialog";
import { Avatar } from "./Avatar";
import { EmojiButton } from "./EmojiButton";
import { Icon } from "./Icon";
import { Spinner } from "./Loading";

/** Alto máximo del campo de escribir (unas 5 líneas); con más texto, se desplaza dentro. */
const CHAT_FIELD_MAX = 140;

/** Cuánto hay que mantener pulsado un mensaje (en el móvil) para denunciarlo. */
const LONG_PRESS_MS = 550;

function fmtWhen(at: number) {
  const dt = new Date(at);
  const hhmm = `${D.pad(dt.getHours())}:${D.pad(dt.getMinutes())}`;
  const key = D.keyOfDate(dt);
  return key === D.todayKey() ? hhmm : `${D.fmtDayShort(key)}, ${hhmm}`;
}

export function Chat({ poll, id, votes, canWrite, admin, reportedByMe, active, seenAt, onUnread, onSeen }: {
  poll: Poll; id: string; votes: Votes;
  /** Puede escribir (y denunciar mensajes): está dentro de la votación. */
  canWrite: boolean;
  /** Administra la votación: ve qué mensajes se han denunciado y puede ocultarlos. */
  admin: boolean;
  /** Mensajes que ya ha denunciado (se marcan y no se pueden volver a denunciar). */
  reportedByMe: Set<string>;
  active: boolean; seenAt: number; onUnread: (n: number) => void; onSeen: (at: number) => void;
}) {
  const { store, user } = useSession();
  const { toast } = useUi();
  const [msgs, setMsgs] = useState<ChatMessage[] | null>(null);
  const [reports, setReports] = useState<Map<string, ChatReport[]>>(() => new Map());
  const [reporting, setReporting] = useState<{ msg: ChatMessage; name: string } | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Baja sola con cada mensaje nuevo, salvo que estés leyendo más arriba.
  const pinned = useRef(true);

  // En el móvil (sin ratón) se denuncia manteniendo pulsado el mensaje, en vez de con una bandera en cada uno: así el
  // chat queda limpio y la bandera solo sale, en rojo, en lo que ya has denunciado. Con ratón, la bandera de siempre.
  const touch = !hasMouse();
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancelPress = () => { if (press.current) clearTimeout(press.current.timer); press.current = null; };
  const startPress = (e: PointerEvent, act: () => void) => {
    if (e.pointerType === "mouse") return;
    cancelPress();
    const timer = window.setTimeout(() => { press.current = null; navigator.vibrate?.(15); act(); }, LONG_PRESS_MS);
    press.current = { timer, x: e.clientX, y: e.clientY };
  };
  // Si el dedo se mueve (está desplazando el chat), no es una pulsación larga.
  const movePress = (e: PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress();
  };
  useEffect(() => cancelPress, []);

  // El campo crece con el texto (saltos de línea incluidos) hasta CHAT_FIELD_MAX px; a partir de ahí, se desplaza.
  // Con la pestaña del chat oculta no se puede medir: se mide al abrirla.
  useAutoGrow(field, text, CHAT_FIELD_MAX, active);

  // Los mensajes de antes de que entraras no se ven (salvo si creaste la votación).
  const since = chatSince(poll, user.uid, votes[user.uid]);
  useEffect(() => store.watchChat(id, since, setMsgs, e => setStatus("No se pudo cargar el chat. " + errMsg(e))), [store, id, since]);

  // Las denuncias solo las ve quien administra la votación.
  useEffect(() => {
    if (!admin) { setReports(new Map()); return; }
    return store.watchReports(id, r => setReports(reportsByMessage(r)), () => setReports(new Map()));
  }, [store, id, admin]);

  const latestAt = msgs ? msgs.reduce((max, m) => Math.max(max, m.at), 0) : 0;

  useEffect(() => {
    if (msgs) onUnread(msgs.filter(m => m.uid !== user.uid && m.at > seenAt).length);
  }, [msgs, seenAt, user.uid, onUnread]);

  // Con la pestaña abierta y la app a la vista, todo lo que llega se da por leído (en segundo plano, no: se marca al
  // volver). Hasta el último mensaje de la votación (chatAt), aunque sea de antes de que entraras y no lo veas: si no,
  // el icono de «Mis votaciones» no se apagaría nunca.
  const visible = usePageVisible();
  const lastAt = Math.max(latestAt, poll.chatAt || 0);
  useEffect(() => {
    if (active && visible && lastAt > seenAt) onSeen(lastAt);
  }, [active, visible, lastAt, seenAt, onSeen]);

  // Oculto (otra pestaña) no tiene altura, así que hay que bajar al último mensaje al mostrarlo.
  useEffect(() => {
    const el = list.current;
    if (el && active && pinned.current) el.scrollTop = el.scrollHeight;
  }, [msgs, active]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setStatus("");
    // El campo se vacía al momento (como en cualquier chat) y el foco no se va, para que el teclado del móvil siga
    // abierto; si falla, el texto vuelve al campo para no perderlo.
    setText("");
    field.current?.focus();
    try {
      pinned.current = true;
      await store.sendChat(id, { uid: user.uid, name: user.name, text: t.slice(0, MAX_CHAT), at: Date.now() });
    } catch (err) {
      setText(cur => cur || t);
      setStatus("No se pudo enviar el mensaje. " + errMsg(err));
    }
    setBusy(false);
  }

  const report = (msg: ChatMessage, name: string) => async (reason: ReportReason, comment: string) => {
    await store.reportMessage(id, {
      msgId: msg.id, msgUid: msg.uid, msgName: name, msgText: msg.text, by: user.uid, byName: user.name,
      reason, ...(comment ? { comment: comment.slice(0, MAX_REPORT_COMMENT) } : {}), at: Date.now(),
    });
    toast("Denuncia enviada. Gracias por avisar");
  };

  const setHidden = async (msg: ChatMessage, hidden: boolean) => {
    try {
      await store.setMessageHidden(id, msg.id, hidden);
      toast(hidden ? "Mensaje ocultado" : "Mensaje visible otra vez");
    } catch (err) {
      setStatus("No se pudo cambiar el mensaje. " + errMsg(err));
    }
  };

  return (
    <section className="chat">
      <p className="chat__note">
        {poll.anonymous
          ? "Habla con el grupo aquí mismo. Los votos son anónimos, pero en el chat se ve tu nombre."
          : "Habla con el grupo aquí mismo, sin salir de la votación."}
        {canWrite && touch && " Mantén pulsado un mensaje para denunciarlo."}
      </p>
      <div className="chat__card">
        <div className="chat__list" ref={list} onScroll={() => {
          const el = list.current;
          if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}>
          {msgs === null
            ? <p className="muted chat__empty" role="status"><Spinner /> Cargando mensajes…</p>
            : !msgs.length
              ? <p className="muted chat__empty">Todavía no hay mensajes. Escribe el primero.</p>
              : msgs.map(m => {
                const own = m.uid === user.uid;
                // Quien sigue en la votación sale con el nombre de su voto (el de ahora); quien se fue, con el que
                // quedó en el mensaje: su nombre sin dueño. Así, si vuelve, sus mensajes recuperan su nombre.
                const v = votes[m.uid];
                const name = isPresent(v) ? v!.name || m.name : m.name;
                if (m.sys) {
                  // Aviso de un cambio: «Ana ha añadido el martes 16 de diciembre».
                  return (
                    <div key={m.id} className="chat__sys">
                      <Icon name="edit" className="chat__sys-icon" />
                      {/* Lo tuyo, sin nombre y en segunda persona («Has cambiado el título»); lo de los demás, con el suyo. */}
                      <p>{own ? D.cap(sysTextFor(m.text, true, user.name)) : <><strong>{name}</strong> {sysTextFor(m.text, false, user.name)}</>}</p>
                      <span className="chat__when">{fmtWhen(m.at)}</span>
                    </div>
                  );
                }
                // Oculto por quien administra: los demás ven un aviso; quien administra, el texto apagado.
                const hidden = !!m.hidden;
                const flagged = reports.get(m.id) || [];
                const reasons = [...new Set(flagged.map(r => REPORT_REASONS[r.reason]))].join(" · ");
                const mine = reportedByMe.has(m.id);
                // Se puede denunciar: no es tuyo, no está oculto y aún no lo has denunciado.
                const reportable = canWrite && !own && !hidden && !mine;
                const report = () => setReporting({ msg: m, name });
                const pressable = touch && reportable;
                return (
                  <div key={m.id} className={cls("chat__msg", own && "chat__msg--own")}>
                    <Avatar name={name} photo={own ? user.photo : v?.photo} size={28} seed={m.uid} />
                    <div className={bem("chat__body", { hidden, pressable })}
                      {...(pressable ? {
                        onPointerDown: (e: PointerEvent) => startPress(e, report), onPointerMove: movePress,
                        onPointerUp: cancelPress, onPointerCancel: cancelPress, onPointerLeave: cancelPress,
                        onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
                      } : {})}>
                      <div className="chat__head">
                        <span className="chat__name">{own ? "Tú" : name}</span>
                        <span className="chat__when">{fmtWhen(m.at)}</span>
                        {admin && flagged.length > 0 && (
                          <span className="chat__flag" data-tip={reasons}>
                            <Icon name="flag" /> {flagged.length === 1 ? "Denunciado" : `Denunciado ×${flagged.length}`}
                          </span>
                        )}
                        <span className="chat__tools">
                          {canWrite && !own && !hidden && mine && (
                            <span className="chat__tool chat__tool--done" role="img" aria-label="Ya has denunciado este mensaje"
                              data-tip="Ya lo has denunciado"><Icon name="flag" /></span>
                          )}
                          {reportable && !touch && (
                            <button type="button" className="chat__tool" aria-label={`Denunciar mensaje de ${name}`} data-tip="Denunciar mensaje"
                              onClick={report}><Icon name="flag" /></button>
                          )}
                          {/* Ocultar, solo lo denunciado (y volver a mostrar lo que ya está oculto). */}
                          {admin && (flagged.length > 0 || hidden) && (
                            <button type="button" className="chat__tool" aria-label={hidden ? "Volver a mostrar el mensaje" : "Ocultar el mensaje"}
                              data-tip={hidden ? "Volver a mostrar" : "Ocultar a todos"} onClick={() => setHidden(m, !hidden)}>
                              <Icon name={hidden ? "eye" : "eyeOff"} />
                            </button>
                          )}
                        </span>
                      </div>
                      {hidden && !admin
                        ? <p className="chat__text chat__text--hidden">Mensaje ocultado por quien administra la votación.</p>
                        : <p className={bem("chat__text", { hidden })}>{m.text}</p>}
                      {hidden && admin && <p className="chat__hidden-note">Oculto: los demás no lo ven.</p>}
                    </div>
                  </div>
                );
              })}
        </div>
        {canWrite ? (
          <form className="chat__form" onSubmit={send}>
            <div className="emoji-field emoji-field--area chat__field">
              {/* Con ratón y teclado (ordenador), Intro envía y Mayúsculas + Intro hace el salto de línea, como en
                  cualquier chat. En el móvil, Intro hace el salto y envía el botón «Enviar». */}
              <textarea ref={field} className="input input--area emoji-field__input" rows={1} maxLength={MAX_CHAT}
                placeholder="Escribe un mensaje" autoComplete="off" aria-label="Mensaje" enterKeyHint={hasMouse() ? "send" : "enter"}
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && hasMouse()) { e.preventDefault(); send(); }
                }} />
              <EmojiButton field={() => field.current} setValue={setText} />
            </div>
            {/* Pulsar «Enviar» no le quita el foco al campo: en el móvil, así el teclado no se cierra y se vuelve a abrir. */}
            <button className="btn chat__send" type="submit" disabled={busy || !text.trim()}
              onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()}>{busy ? "Enviando…" : "Enviar"}</button>
          </form>
        ) : (
          <p className="chat__note chat__closed">Entra en la votación para escribir en el chat.</p>
        )}
      </div>
      <div className="status" role="alert">{status}</div>
      {reporting && (
        <ReportDialog title="Denunciar mensaje" quote={<><strong>{reporting.name}:</strong> {reporting.msg.text}</>}
          question="¿Qué pasa con este mensaje?" already="Ya habías denunciado este mensaje."
          note="La verán quienes administran la votación, que pueden ocultar el mensaje o expulsar a quien lo escribió, y el equipo de Hilemos."
          onSend={report(reporting.msg, reporting.name)} onClose={() => setReporting(null)} />
      )}
    </section>
  );
}
