// Chat de una votación: la conversación que antes se iba al grupo de WhatsApp y allí se perdía. Además de los
// mensajes, los avisos de los cambios que hace un administrador al editar la votación (sys).
import { useEffect, useRef, useState, type FormEvent } from "react";
import * as D from "../lib/dates";
import { MAX_CHAT, MAX_REPORT_COMMENT, REPORT_REASONS, chatSince, isPresent, reportsByMessage } from "../lib/model";
import type { ChatMessage, ChatReport, Poll, ReportReason, Votes } from "../lib/types";
import { bem, cls, errMsg } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { ReportDialog } from "./ReportDialog";
import { Avatar } from "./Avatar";
import { EmojiButton } from "./EmojiButton";
import { Icon } from "./Icon";
import { Spinner } from "./Loading";

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
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Baja sola con cada mensaje nuevo, salvo que estés leyendo más arriba.
  const pinned = useRef(true);

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

  // Con la pestaña abierta, todo lo que llega se da por leído.
  useEffect(() => {
    if (active && latestAt > seenAt) onSeen(latestAt);
  }, [active, latestAt, seenAt, onSeen]);

  // Oculto (otra pestaña) no tiene altura, así que hay que bajar al último mensaje al mostrarlo.
  useEffect(() => {
    const el = list.current;
    if (el && active && pinned.current) el.scrollTop = el.scrollHeight;
  }, [msgs, active]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setStatus("");
    try {
      pinned.current = true;
      await store.sendChat(id, { uid: user.uid, name: user.name, text: t.slice(0, MAX_CHAT), at: Date.now() });
      setText("");
    } catch (err) {
      setStatus("No se pudo enviar el mensaje. " + errMsg(err));
    }
    setBusy(false);
    field.current?.focus();
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
                      <p><strong>{own ? user.name : name}</strong> {m.text}</p>
                      <span className="chat__when">{fmtWhen(m.at)}</span>
                    </div>
                  );
                }
                // Oculto por quien administra: los demás ven un aviso; quien administra, el texto apagado.
                const hidden = !!m.hidden;
                const flagged = reports.get(m.id) || [];
                const reasons = [...new Set(flagged.map(r => REPORT_REASONS[r.reason]))].join(" · ");
                return (
                  <div key={m.id} className={cls("chat__msg", own && "chat__msg--own")}>
                    <Avatar name={name} photo={own ? user.photo : v?.photo} size={28} seed={m.uid} />
                    <div className={bem("chat__body", { hidden })}>
                      <div className="chat__head">
                        <span className="chat__name">{own ? "Tú" : name}</span>
                        <span className="chat__when">{fmtWhen(m.at)}</span>
                        {admin && flagged.length > 0 && (
                          <span className="chat__flag" data-tip={reasons}>
                            <Icon name="flag" /> {flagged.length === 1 ? "Denunciado" : `Denunciado ×${flagged.length}`}
                          </span>
                        )}
                        <span className="chat__tools">
                          {canWrite && !own && !hidden && (reportedByMe.has(m.id)
                            ? (
                              <span className="chat__tool chat__tool--done" role="img" aria-label="Ya has denunciado este mensaje"
                                data-tip="Ya lo has denunciado"><Icon name="flag" /></span>
                            )
                            : (
                              <button type="button" className="chat__tool" aria-label={`Denunciar mensaje de ${name}`} data-tip="Denunciar mensaje"
                                onClick={() => setReporting({ msg: m, name })}><Icon name="flag" /></button>
                            ))}
                          {admin && (
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
            <div className="emoji-field chat__field">
              <input ref={field} className="input emoji-field__input" maxLength={MAX_CHAT} placeholder="Escribe un mensaje" autoComplete="off"
                aria-label="Mensaje" value={text} onChange={e => setText(e.target.value)} />
              <EmojiButton field={() => field.current} setValue={setText} />
            </div>
            <button className="btn chat__send" type="submit" disabled={busy || !text.trim()}>{busy ? "Enviando…" : "Enviar"}</button>
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
