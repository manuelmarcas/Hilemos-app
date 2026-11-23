// Quién puede entrar: solicitudes y ajustes de acceso (administradores), y las pantallas de quien está pendiente
// o no puede entrar (privada, completa o sin cuenta).
import { useEffect, useRef, useState } from "react";
import { MAX_EMAILS, MAX_PEOPLE, TYPE, isFull, losingAccess, minMaxPeople, parseEmails, plural, pollRange, type LosingAccess } from "../../lib/model";
import type { MemberStatus, Poll, Vote, Votes } from "../../lib/types";
import { bem, errMsg } from "../../lib/util";
import { useSession } from "../../state/session";
import { useUi } from "../../state/ui";
import { Avatar } from "../../components/Avatar";
import { Icon } from "../../components/Icon";
import { EmailChips, joinEmails } from "../../components/EmailChips";

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
      <div className="requests__head">
        <h2 className="requests__title"><Icon name="approve" /> Solicitudes {pending.length > 0 && <span className="requests__count">{pending.length}</span>}</h2>
        {rejected.length > 0 && (
          <button type="button" className="link-btn" aria-expanded={showRejected} onClick={() => setShowRejected(v => !v)}>
            {showRejected ? "Ocultar rechazadas" : `Ver rechazadas (${rejected.length})`}
          </button>
        )}
      </div>
      {pending.length > 0
        ? <p className="requests__sub">Estas personas han abierto el enlace. No pueden votar ni ver los resultados hasta que las aceptes.</p>
        : <p className="requests__sub">No hay solicitudes pendientes.</p>}
      <ul className="requests__list">
        {pending.map(r => (
          <li key={r.uid} className="requests__row">
            <span className="person requests__person"><Avatar name={r.name || "Alguien"} photo={r.photo || ""} size={30} seed={r.uid} />{r.name || "Alguien"}</span>
            <span className="requests__actions">
              <button type="button" className="btn btn--small btn--primary" onClick={() => onSet(r.uid, "accepted", "pending")}>Aceptar</button>
              <button type="button" className="btn btn--small btn--danger" onClick={() => onSet(r.uid, "rejected", "pending")}>Rechazar</button>
            </span>
          </li>
        ))}
        {showRejected && rejected.map(r => (
          <li key={r.uid} className="requests__row requests__row--rejected">
            <span className="person requests__person"><Avatar name={r.name || "Alguien"} photo={r.photo || ""} size={30} seed={r.uid} />{r.name || "Alguien"}
              <span className="muted"> · rechazada</span></span>
            <span className="requests__actions">
              <button type="button" className="btn btn--small" disabled={full} data-tip={full ? "No quedan plazas" : undefined}
                onClick={() => onSet(r.uid, "accepted", "rejected")}>Aceptar</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * «Acceso y plazas» (administradores): tope de personas y, en las privadas, correos permitidos. El tope no puede bajar
 * de las plazas ocupadas (`minMaxPeople`); para eso hay que expulsar antes a alguien (`onPeople` abre ese panel).
 */
export function AccessPanel({ poll, votes, onClose, onPeople, onRemoveByEmail }: {
  poll: Poll; votes: Votes; onClose: () => void; onPeople: () => void;
  /** Privadas: expulsa (o rechaza, si estaban pendientes) a quienes se quita el correo de la lista. */
  onRemoveByEmail: (people: LosingAccess[]) => Promise<void>;
}) {
  const { store, user } = useSession();
  const { toast, confirm } = useUi();
  const members = poll.members || 0;
  const [maxText, setMaxText] = useState(String(poll.maxPeople ?? MAX_PEOPLE));
  // Correos en burbujas y lo que queda a medio escribir (ver EmailChips).
  const [emailList, setEmailList] = useState({ emails: [] as string[], draft: "" });
  // La lista guardada y con qué correo entró cada participante, para saber a quién deja fuera un cambio.
  const [saved, setSaved] = useState<string[]>([]);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const emailsText = joinEmails(emailList.emails, emailList.draft);
  const [loaded, setLoaded] = useState(!poll.emailsOnly);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const maxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!poll.emailsOnly) return;
    store.getAccess(poll.id)
      .then(a => { setEmailList({ emails: a?.emails || [], draft: "" }); setSaved(a?.emails || []); setLoaded(true); })
      .catch(e => { setErr("No se pudieron leer los correos. " + errMsg(e)); setLoaded(true); });
    // Si no se pueden leer, se guarda igual: solo que nadie sale de la votación por quitar su correo.
    store.getMemberEmails(poll.id).then(setMemberEmails).catch(() => setMemberEmails({}));
  }, [store, poll.id, poll.emailsOnly]);

  const parsed = parseEmails(emailsText);
  const losing = poll.emailsOnly && loaded ? losingAccess(poll, votes, memberEmails, saved, parsed.emails) : [];
  // A un administrador solo le expulsa el creador (como en las reglas).
  const untouchable = losing.filter(p => p.admin && poll.ownerUid !== user.uid);
  // Se recalcula en directo: si entra alguien mientras se edita, el mínimo sube.
  const min = minMaxPeople(poll);
  const n = Number(maxText.trim());
  // Por debajo de las plazas ocupadas (si es por bajar de 2, vale el aviso general al guardar).
  const tooLow = maxText.trim() !== "" && Number.isInteger(n) && n < members;
  const tooLowMsg = `Ya ocupan plaza ${members} personas, así que el máximo no puede ser menor. Para bajarlo, expulsa antes a alguien.`;
  async function save() {
    if (tooLow) { maxRef.current?.focus(); return; } // el aviso ya está bajo el campo
    if (!Number.isInteger(n) || n < min || n > MAX_PEOPLE) {
      setErr(`El máximo debe ser un número entre ${min} y ${MAX_PEOPLE}.`);
      return;
    }
    if (poll.emailsOnly) {
      if (parsed.invalid.length) { setErr("Revisa estos correos: " + parsed.invalid.slice(0, 3).join(", ")); return; }
      if (!parsed.emails.length) { setErr("Deja al menos un correo."); return; }
      if (parsed.emails.length > MAX_EMAILS) { setErr(`Como mucho ${MAX_EMAILS} correos.`); return; }
      if (untouchable.length) {
        setErr(`${names(untouchable)} ${untouchable.length === 1 ? "administra" : "administran"} la votación: solo quien la creó puede quitar ${untouchable.length === 1 ? "su correo" : "sus correos"}.`);
        return;
      }
      if (losing.length && !(await confirm(losingConfirm(losing)))) return;
    }
    setBusy(true);
    setErr("");
    try {
      if (n !== poll.maxPeople) await store.updatePoll(poll.id, { maxPeople: n });
      if (poll.emailsOnly) await store.setAccess(poll.id, { emails: parsed.emails });
      if (losing.length) await onRemoveByEmail(losing);
      toast(losing.length ? `Acceso guardado: ${plural(losing.length, ["persona ya no está", "personas ya no están"])} en la votación` : "Acceso guardado");
      onClose();
    } catch (e) {
      // Las reglas lo rechazan si, mientras se editaba, entró gente y el máximo quedó por debajo.
      setErr((e as { code?: string })?.code === "permission-denied" && n < minMaxPeople(poll)
        ? tooLowMsg : "No se pudo guardar. " + errMsg(e));
      setBusy(false);
    }
  }

  return (
    <section className="access-panel" aria-label="Acceso y plazas">
      <h2 className="access-panel__title"><Icon name="settings" /> Acceso y plazas</h2>
      <label className="field-label access-panel__label" htmlFor="ap-max">Máximo de personas</label>
      <input ref={maxRef} id="ap-max" className="input input--small" type="number" inputMode="numeric" min={min} max={MAX_PEOPLE}
        value={maxText} aria-invalid={tooLow} aria-describedby="ap-max-hint"
        onChange={e => { setMaxText(e.target.value); setErr(""); }} />
      <p id="ap-max-hint" className="hint access-panel__hint">
        {tooLow
          ? <><span className="hint__warn">{tooLowMsg}</span> <button type="button" className="link-btn" onClick={onPeople}>Gestionar participantes</button></>
          : members >= 2 ? `Ya ocupan plaza ${members} personas, así que no puede ser menos.` : "Como mínimo, 2 personas."}
      </p>
      {poll.emailsOnly && (
        <>
          <label className="field-label access-panel__label" htmlFor="ap-emails">Correos que pueden entrar</label>
          <EmailChips id="ap-emails" emails={emailList.emails} draft={emailList.draft} disabled={!loaded}
            onChange={(emails, draft) => { setEmailList({ emails, draft }); setErr(""); }} />
          <p className="hint access-panel__hint">
            {losing.length > 0 && <><span className="hint__warn">Al guardar, {names(losing)} {losing.length === 1 ? "dejará" : "dejarán"} de estar en la votación: {losing.length === 1 ? "su correo ya no está" : "sus correos ya no están"} en la lista.</span> </>}
            Si quitas el correo de alguien que ya está dentro, se le expulsa (antes te lo pediremos confirmar). A quien
            no se reconozca por su correo, expúlsale desde <button type="button" className="link-btn" onClick={onPeople}>Gestionar participantes</button>
          </p>
        </>
      )}
      <div className="status" role="alert">{err}</div>
      <div className="access-panel__actions">
        <button type="button" className="btn btn--primary" disabled={busy || !loaded} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      </div>
    </section>
  );
}

/** «Ana», «Ana y Luis», «Ana, Luis y Pepa». */
const names = (people: { name: string }[]) => {
  const n = people.map(p => p.name);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}` : n[0] || "";
};

/** Confirmación al quitar correos de gente que ya está dentro: quién es y qué le pasa. */
function losingConfirm(losing: LosingAccess[]) {
  const inside = losing.filter(p => !p.pending);
  const pending = losing.filter(p => p.pending);
  const who = (ps: LosingAccess[]) => names(ps.map(p => ({ name: `${p.name} (${p.email})` })));
  const parts: string[] = [];
  if (inside.length) {
    const one = inside.length === 1;
    parts.push(`${who(inside)} ${one ? "ya está" : "ya están"} en la votación. Si quitas ${one ? "su correo, se le expulsará" : "sus correos, se les expulsará"}: ` +
      `se borrarán sus votos, no ${one ? "podrá" : "podrán"} volver a entrar con el enlace ni escribir en el chat, y sus mensajes se quedan. ` +
      `Podrás volver a ${one ? "admitirle" : "admitirles"} desde «Gestionar participantes».`);
  }
  if (pending.length) parts.push(`Se rechazará la solicitud de ${who(pending)}.`);
  return {
    title: inside.length ? `¿Quitar ${inside.length === 1 ? "el correo de alguien" : "los correos de gente"} que ya está dentro?` : "¿Rechazar sus solicitudes?",
    message: parts.join(" "),
    confirmLabel: inside.length ? (inside.length === 1 ? "Quitar y expulsar" : "Quitar y expulsarles") : "Quitar y rechazar",
    cancelLabel: "No quitar",
    danger: true,
  };
}

/** Cabecera de la votación (tipo, creador, título y descripción) para quien aún no puede verla entera. */
function AccessHead({ poll }: { poll: Poll }) {
  const t = TYPE[poll.type];
  return (
    <div className="poll-head">
      <div className="poll-head__main">
        <div className="poll-head__kicker"><Icon name={t.icon} /> Votación por {t.name.toLowerCase()} · creada por {poll.ownerName || "alguien"}</div>
        <div className="poll-head__title-row"><h1 className="poll-head__title">{poll.title}</h1></div>
        {poll.description && <p className="poll-head__desc">{poll.description}</p>}
      </div>
    </div>
  );
}

/**
 * Quien no participa (todavía o ya): ha pedido entrar en una votación con aprobación y aún no está aceptado, no le
 * han aceptado o le han expulsado de la votación (`removed`).
 */
export function WaitingView({ poll, status, removed }: { poll: Poll; status: MemberStatus; removed?: boolean }) {
  const owner = poll.ownerName || "Quien la creó";
  return <>
    <AccessHead poll={poll} />
    <div className={bem("notice", { [status]: true })} role="status">
      {removed ? <>
        <h2 className="notice__title"><Icon name="ban" /> Te han expulsado de esta votación</h2>
        <p>Quien la administra te ha expulsado, así que ya no puedes votar, ver los resultados ni escribir en el chat.</p>
      </> : status === "rejected" ? <>
        <h2 className="notice__title"><Icon name="ban" /> No te han aceptado</h2>
        <p>{owner} no ha aceptado tu solicitud para esta votación, así que no puedes votar ni ver los resultados.</p>
      </> : <>
        <h2 className="notice__title"><Icon name="hourglass" /> Pendiente de aprobación</h2>
        <p>{owner} tiene que aceptarte para que puedas votar y ver los resultados. La votación ya está en tu menú: cuando te acepte, se abrirá aquí sola.</p>
      </>}
    </div>
    <p className="poll-info__note">{pollRange(poll)}</p>
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
      <div className="notice notice--blocked" role="status">
        <h2 className="notice__title"><Icon name="key" /> Hace falta una cuenta</h2>
        <p>
          {poll.emailsOnly
            ? `${owner} ha limitado esta votación a unos correos concretos, así que hay que entrar con Google para comprobar el tuyo (o guardar tu cuenta con ese correo en «Tu perfil»).`
            : `${owner} tiene que aceptar a cada participante, así que hay que entrar con Google para que sepa quién eres (o guardar tu cuenta con tu correo en «Tu perfil»).`}
        </p>
        <button type="button" className="btn btn--primary notice__retry" onClick={login}>Entrar con Google</button>
        <div className="status" role="alert">{status}</div>
      </div>
      <p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p>
    </>;
  }

  return <>
    <AccessHead poll={poll} />
    <div className="notice notice--blocked" role="status">
      {kind === "noaccess" ? <>
        <h2 className="notice__title"><Icon name="mail" /> Votación privada</h2>
        <p>Solo pueden entrar las personas invitadas por {owner}. Has entrado como <strong>{email || "una cuenta sin correo"}</strong>: si te invitó con otro correo, entra con esa cuenta o pídele que añada este.</p>
        <button type="button" className="btn btn--small notice__retry" onClick={onRetry}>Volver a intentarlo</button>
      </> : <>
        <h2 className="notice__title"><Icon name="users" /> Votación completa</h2>
        <p>Ya hay {poll.maxPeople} personas, {poll.maxPeople === MAX_PEOPLE ? "el máximo de cualquier votación" : `el máximo que ha puesto ${owner}`}. Si alguien deja sitio, podrás entrar.</p>
      </>}
    </div>
    <p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p>
  </>;
}
