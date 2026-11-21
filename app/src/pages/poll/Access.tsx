// Quién puede entrar: solicitudes y ajustes de acceso (administradores), y las pantallas de quien está pendiente
// o no puede entrar (privada, completa o sin cuenta).
import { useEffect, useState } from "react";
import { MAX_EMAILS, MAX_PEOPLE, TYPE, isFull, parseEmails, pollRange } from "../../lib/model";
import type { MemberStatus, Poll, Vote } from "../../lib/types";
import { errMsg } from "../../lib/util";
import { useSession } from "../../state/session";
import { useUi } from "../../state/ui";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";

/** Solicitudes pendientes (y rechazadas, para poder readmitirlas). Solo las ven quienes administran la votación. */
export function Requests({ poll, requests, onSet }: {
  poll: Poll; requests: (Vote & { uid: string })[]; onSet: (uid: string, to: MemberStatus, from: MemberStatus) => void;
}) {
  const pending = requests.filter(r => r.status === "pending");
  const rejected = requests.filter(r => r.status === "rejected");
  const [showRejected, setShowRejected] = useState(false);
  const full = isFull(poll);
  return (
    <section className="requests">
      <div className="rq-head">
        <h2><Icon name="approve" /> Solicitudes {pending.length > 0 && <span className="rq-count">{pending.length}</span>}</h2>
        {rejected.length > 0 && (
          <button type="button" className="link-btn" aria-expanded={showRejected} onClick={() => setShowRejected(v => !v)}>
            {showRejected ? "Ocultar rechazadas" : `Ver rechazadas (${rejected.length})`}
          </button>
        )}
      </div>
      {pending.length > 0
        ? <p className="rq-sub">Estas personas han abierto el enlace. No pueden votar ni ver los resultados hasta que las aceptes.</p>
        : <p className="rq-sub">No hay solicitudes pendientes.</p>}
      <ul className="rq-list">
        {pending.map(r => (
          <li key={r.uid} className="rq-row">
            <span className="person"><Avatar name={r.name || "Alguien"} photo={r.photo || ""} size={30} seed={r.uid} />{r.name || "Alguien"}</span>
            <span className="rq-actions">
              <button type="button" className="btn small primary" onClick={() => onSet(r.uid, "accepted", "pending")}>Aceptar</button>
              <button type="button" className="btn small danger" onClick={() => onSet(r.uid, "rejected", "pending")}>Rechazar</button>
            </span>
          </li>
        ))}
        {showRejected && rejected.map(r => (
          <li key={r.uid} className="rq-row rejected">
            <span className="person"><Avatar name={r.name || "Alguien"} photo={r.photo || ""} size={30} seed={r.uid} />{r.name || "Alguien"}
              <span className="muted"> · rechazada</span></span>
            <span className="rq-actions">
              <button type="button" className="btn small" disabled={full} title={full ? "No quedan plazas" : undefined}
                onClick={() => onSet(r.uid, "accepted", "rejected")}>Aceptar</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** «Acceso y plazas» (administradores): tope de personas y, en las privadas, correos permitidos. */
export function AccessPanel({ poll, onClose }: { poll: Poll; onClose: () => void }) {
  const { store } = useSession();
  const { toast } = useUi();
  const members = poll.members || 0;
  const [maxText, setMaxText] = useState(String(poll.maxPeople ?? MAX_PEOPLE));
  const [emailsText, setEmailsText] = useState("");
  const [loaded, setLoaded] = useState(!poll.emailsOnly);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!poll.emailsOnly) return;
    store.getAccess(poll.id)
      .then(a => { setEmailsText((a?.emails || []).join("\n")); setLoaded(true); })
      .catch(e => { setErr("No se pudieron leer los correos. " + errMsg(e)); setLoaded(true); });
  }, [store, poll.id, poll.emailsOnly]);

  const parsed = parseEmails(emailsText);
  const min = Math.max(2, members);
  async function save() {
    const n = Number(maxText.trim());
    if (!Number.isInteger(n) || n < min || n > MAX_PEOPLE) {
      setErr(`El máximo debe estar entre ${min} y ${MAX_PEOPLE}${members > 2 ? ` (ya hay ${members} personas dentro)` : ""}.`);
      return;
    }
    if (poll.emailsOnly) {
      if (parsed.invalid.length) { setErr("Revisa estos correos: " + parsed.invalid.slice(0, 3).join(", ")); return; }
      if (!parsed.emails.length) { setErr("Deja al menos un correo."); return; }
      if (parsed.emails.length > MAX_EMAILS) { setErr(`Como mucho ${MAX_EMAILS} correos.`); return; }
    }
    setBusy(true);
    setErr("");
    try {
      if (n !== poll.maxPeople) await store.updatePoll(poll.id, { maxPeople: n });
      if (poll.emailsOnly) await store.setAccess(poll.id, { emails: parsed.emails });
      toast("Acceso guardado");
      onClose();
    } catch (e) {
      setErr("No se pudo guardar. " + errMsg(e));
      setBusy(false);
    }
  }

  return (
    <section className="access-panel" aria-label="Acceso y plazas">
      <h2><Icon name="settings" /> Acceso y plazas</h2>
      <label className="field-label" htmlFor="ap-max">Máximo de personas <span className="muted">(ahora hay {members})</span></label>
      <input id="ap-max" className="input small" type="number" inputMode="numeric" min={min} max={MAX_PEOPLE}
        value={maxText} onChange={e => setMaxText(e.target.value)} />
      {poll.emailsOnly && (
        <>
          <label className="field-label" htmlFor="ap-emails">Correos que pueden entrar</label>
          <textarea id="ap-emails" className="input" rows={4} value={emailsText} disabled={!loaded}
            onChange={e => setEmailsText(e.target.value)} spellCheck={false} />
          <p className="hint">Quitar un correo no echa a quien ya ha entrado: solo impide que entren nuevas personas con él.</p>
        </>
      )}
      <div className="status" role="alert">{err}</div>
      <div className="ap-actions">
        <button type="button" className="btn primary" disabled={busy || !loaded} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      </div>
    </section>
  );
}

/** Cabecera de la votación (tipo, creador, título y descripción) para quien aún no puede verla entera. */
function AccessHead({ poll }: { poll: Poll }) {
  const t = TYPE[poll.type];
  return (
    <div className="poll-head">
      <div className="poll-title">
        <div className="kicker"><Icon name={t.icon} /> Votación por {t.name.toLowerCase()} · creada por {poll.ownerName || "alguien"}</div>
        <div className="title-row"><h1>{poll.title}</h1></div>
        {poll.description && <p className="desc">{poll.description}</p>}
      </div>
    </div>
  );
}

/** Quien ha pedido entrar en una votación con aprobación y aún no está aceptado. */
export function WaitingView({ poll, status }: { poll: Poll; status: MemberStatus }) {
  const owner = poll.ownerName || "Quien la creó";
  return <>
    <AccessHead poll={poll} />
    <div className={`gate-note ${status}`} role="status">
      {status === "rejected" ? <>
        <h2><Icon name="ban" /> No te han aceptado</h2>
        <p>{owner} no ha aceptado tu solicitud para esta votación, así que no puedes votar ni ver los resultados.</p>
      </> : <>
        <h2><Icon name="hourglass" /> Pendiente de aprobación</h2>
        <p>{owner} tiene que aceptarte para que puedas votar y ver los resultados. La votación ya está en tu menú: cuando te acepte, se abrirá aquí sola.</p>
      </>}
    </div>
    <p className="poll-note">{pollRange(poll)}</p>
    <p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p>
  </>;
}

/** No se puede entrar: votación privada sin invitación, completa, o restringida y sin cuenta. */
export function BlockedView({ poll, kind, email, onRetry }: {
  poll: Poll; kind: "full" | "noaccess" | "needsaccount"; email: string; onRetry: () => void;
}) {
  const { store, user } = useSession();
  const owner = poll.ownerName || "quien la creó";
  const [status, setStatus] = useState("");

  // Sin cuenta: primero se intenta guardar esta sesión en Google (conserva votaciones y votos); si esa cuenta
  // de Google ya existía, se entra con ella.
  const login = async () => {
    setStatus("");
    try {
      if (user.anon) {
        try { await store.linkGoogle(); location.reload(); return; }
        catch (e) { if ((e as { code?: string })?.code !== "auth/credential-already-in-use") throw e; }
      }
      await store.signIn();
    }
    catch (e) { setStatus("No se pudo iniciar sesión. " + errMsg(e)); }
  };

  if (kind === "needsaccount") {
    return <>
      <AccessHead poll={poll} />
      <div className="gate-note blocked" role="status">
        <h2><Icon name="key" /> Hace falta una cuenta</h2>
        <p>
          {poll.emailsOnly
            ? `${owner} ha limitado esta votación a unos correos concretos, así que hay que entrar con Google para comprobar el tuyo (o guardar tu cuenta con ese correo en «Tu perfil»).`
            : `${owner} tiene que aceptar a cada participante, así que hay que entrar con Google para que sepa quién eres (o guardar tu cuenta con tu correo en «Tu perfil»).`}
        </p>
        <button type="button" className="btn primary gate-retry" onClick={login}>Entrar con Google</button>
        <div className="status" role="alert">{status}</div>
      </div>
      <p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p>
    </>;
  }

  return <>
    <AccessHead poll={poll} />
    <div className="gate-note blocked" role="status">
      {kind === "noaccess" ? <>
        <h2><Icon name="mail" /> Votación privada</h2>
        <p>Solo pueden entrar las personas invitadas por {owner}. Has entrado como <strong>{email || "una cuenta sin correo"}</strong>: si te invitó con otro correo, entra con esa cuenta o pídele que añada este.</p>
        <button type="button" className="btn small gate-retry" onClick={onRetry}>Volver a intentarlo</button>
      </> : <>
        <h2><Icon name="users" /> Votación completa</h2>
        <p>Ya hay {poll.maxPeople} personas, {poll.maxPeople === MAX_PEOPLE ? "el máximo de cualquier votación" : `el máximo que ha puesto ${owner}`}. Si alguien deja sitio, podrás entrar.</p>
      </>}
    </div>
    <p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p>
  </>;
}
