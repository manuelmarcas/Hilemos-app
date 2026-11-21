// Chat de una votación: la conversación que antes se iba al grupo de WhatsApp y allí se perdía.
import { useEffect, useRef, useState, type FormEvent } from "react";
import * as D from "../lib/dates";
import { MAX_CHAT, isPresent } from "../lib/model";
import type { ChatMessage, Poll, Votes } from "../lib/types";
import { cls, errMsg } from "../lib/util";
import { useSession } from "../state/session";
import { Avatar } from "./Avatar";
import { EmojiButton } from "./EmojiButton";

function fmtWhen(at: number) {
  const dt = new Date(at);
  const hhmm = `${D.pad(dt.getHours())}:${D.pad(dt.getMinutes())}`;
  const key = D.keyOfDate(dt);
  return key === D.todayKey() ? hhmm : `${D.fmtDayShort(key)}, ${hhmm}`;
}

export function Chat({ poll, id, votes, canWrite, active, seenAt, onUnread, onSeen }: {
  poll: Poll; id: string; votes: Votes; canWrite: boolean; active: boolean;
  seenAt: number; onUnread: (n: number) => void; onSeen: (at: number) => void;
}) {
  const { store, user } = useSession();
  const [msgs, setMsgs] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Baja sola con cada mensaje nuevo, salvo que estés leyendo más arriba.
  const pinned = useRef(true);

  useEffect(() => store.watchChat(id, setMsgs, e => setStatus("No se pudo cargar el chat. " + errMsg(e))), [store, id]);

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

  return (
    <section className="chat">
      <p className="chat-note">
        {poll.anonymous
          ? "Habla con el grupo aquí mismo. Los votos son anónimos, pero en el chat se ve tu nombre."
          : "Habla con el grupo aquí mismo, sin salir de la votación."}
      </p>
      <div className="chat-card">
        <div className="chat-list" ref={list} onScroll={() => {
          const el = list.current;
          if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}>
          {msgs === null
            ? <p className="muted">Cargando mensajes…</p>
            : !msgs.length
              ? <p className="muted">Todavía no hay mensajes. Escribe el primero.</p>
              : msgs.map(m => {
                const own = m.uid === user.uid;
                // Quien sigue en la votación sale con el nombre de su voto (el de ahora); quien se fue, con el que
                // quedó en el mensaje: su nombre sin dueño. Así, si vuelve, sus mensajes recuperan su nombre.
                const v = votes[m.uid];
                const name = isPresent(v) ? v!.name || m.name : m.name;
                return (
                  <div key={m.id} className={cls("chat-msg", own && "own")}>
                    <Avatar name={name} photo={own ? user.photo : v?.photo} size={28} seed={m.uid} />
                    <div className="chat-body">
                      <div className="chat-head">
                        <span className="chat-name">{own ? "Tú" : name}</span>
                        <span className="chat-when">{fmtWhen(m.at)}</span>
                      </div>
                      <p className="chat-text">{m.text}</p>
                    </div>
                  </div>
                );
              })}
        </div>
        {canWrite ? (
          <form className="chat-form" onSubmit={send}>
            <div className="emoji-field">
              <input ref={field} className="input" maxLength={MAX_CHAT} placeholder="Escribe un mensaje" autoComplete="off"
                aria-label="Mensaje" value={text} onChange={e => setText(e.target.value)} />
              <EmojiButton field={() => field.current} setValue={setText} />
            </div>
            <button className="btn" type="submit" disabled={busy || !text.trim()}>{busy ? "Enviando…" : "Enviar"}</button>
          </form>
        ) : (
          <p className="chat-note chat-closed">Entra en la votación para escribir en el chat.</p>
        )}
      </div>
      <div className="status" role="alert">{status}</div>
    </section>
  );
}
