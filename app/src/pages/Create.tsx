// Pantalla "Nueva votación". Con `edit`, la misma pantalla sirve para editar una votación: se cambian el nombre y
// la descripción, y se pueden añadir días, horas u opciones, pero no quitar lo que ya tiene votos ni cambiar el
// tipo (para eso está duplicarla). Cada cambio se avisa en el chat.
import { useEffect, useRef, useState, type MouseEvent } from "react";
import * as D from "../lib/dates";
import {
  TYPES, TYPE, MAX_OPTIONS, MAX_PEOPLE, FREE_PEOPLE, FREE_OPEN, MAX_DESCRIPTION, MAX_EMAILS, MAX_CHOICES, MIN_CHOICES, DEFAULT_CHOICE_ICON, parseEmails, plural,
  fmtDeadline, lostVotedUnit, unitLabel, unitParts,
} from "../lib/model";
import { describeChanges } from "../lib/changes";
import type { Poll, PollAccess, PollData, PollType, Votes } from "../lib/types";
import { bem, cls, errMsg, hasMouse } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { navigate } from "../state/route";
import { editTemplate, takeTemplate, type TemplateOption } from "../state/duplicate";
import { useOpenManaged } from "../state/openManaged";
import { GroupSelect } from "../components/GroupSelect";
import { EmojiButton } from "../components/EmojiButton";
import { Icon, type IconName } from "../components/Icon";
import { PremiumNote, PremiumTag } from "../components/Premium";
import { CharCount } from "../components/CharCount";
import type { PremiumFeature } from "../lib/premium";
import { useDismiss } from "../hooks/useDismiss";
import { useAutoGrow } from "../hooks/useAutoGrow";
import { Spinner } from "../components/Loading";
import { EmailChips, joinEmails, splitEmails } from "../components/EmailChips";

// Ejemplos según el número de opciones: el nombre solo se muestra como placeholder (no se rellena)
// y el icono se propone mientras no se haya elegido otro.
const PRESETS: Record<number, [string, string][]> = {
  1: [["Disponible", "✅"]],
  2: [["Comida", "🍽️"], ["Cena", "🌙"]],
  3: [["Desayuno", "☕"], ["Comida", "🍽️"], ["Cena", "🌙"]],
  4: [["Mañana", "🌅"], ["Mediodía", "☀️"], ["Tarde", "🌇"], ["Noche", "🌙"]],
};

interface Opt { id?: string; name: string; icon: string; touched: boolean } // touched = icono elegido a mano

/** Opción libre del formulario. `key`: para React (las filas se quitan y se añaden); `id`: la ya guardada, al editar. */
interface Choice { key: string; id?: string; name: string; icon: string }
let choiceSeq = 0;
const newChoice = (c?: TemplateOption): Choice => ({ key: `ch${++choiceSeq}`, name: "", icon: "", ...c });
const CHOICE_EXAMPLES = ["Restaurante italiano", "Asador", "Japonés"];
/** Alto máximo de la descripción (unas 8 líneas); con más texto, se desplaza dentro. */
const DESC_FIELD_MAX = 200;

/** Id nuevo con `prefix` que no esté en `used` (o1, o2… / c1, c2…). Lo añade a `used`. */
function freshId(prefix: string, used: Set<string>) {
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  used.add(`${prefix}${n}`);
  return `${prefix}${n}`;
}

/** Votación que se edita (en vez de crear una nueva) y sus votos, para no dejar quitar lo que ya tiene votos. */
export interface EditTarget { id: string; poll: Poll; votes: Votes }

const applyPresets = (opts: Opt[], count: number) =>
  opts.map((o, i) => (!o.touched && PRESETS[count][i] ? { ...o, icon: PRESETS[count][i][1] } : o));

const MAX_HOURS = 48; // horas sueltas, como mucho por día (son todas las medias horas del día)

const toggled = (set: Set<string>, k: string) => {
  const next = new Set(set);
  next.has(k) ? next.delete(k) : next.add(k);
  return next;
};

// Desplegable de horas de un día: varias elegibles a la vez, sin cerrarse al marcar una.
function HourDropdown({ day, options, chosen, onToggle }: {
  day: string; options: string[]; chosen: string[]; onToggle: (h: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useDismiss(open, setOpen, wrap, btn);

  const label = chosen.length ? plural(chosen.length, ["hora elegida", "horas elegidas"]) : "Elegir horas…";

  return (
    <div className="hour-dd" ref={wrap}>
      <button type="button" ref={btn} className="input hour-dd__btn" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`Horas del ${D.fmtDayShort(day)}`} onClick={() => setOpen(o => !o)}>
        <span className="hour-dd__label">{label}</span>
        <span className="hour-dd__arrow" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="hour-dd__menu" role="listbox" aria-multiselectable="true" aria-label={`Horas del ${D.fmtDayShort(day)}`}>
          {options.map(h => {
            const on = chosen.includes(h);
            return (
              <button key={h} type="button" role="option" aria-selected={on} className={cls("hour-dd__opt", on && "hour-dd__opt--on")}
                onClick={() => onToggle(h)}>
                <span className="hour-dd__check" aria-hidden="true">{on && <Icon name="check" />}</span>{h}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Create({ edit }: { edit?: EditTarget } = {}) {
  const { store, user, library, lastGroup, setLastGroup } = useSession();
  const { toast, confirm, openEmoji, closeEmoji } = useUi();
  const now = useRef(new Date()).current;
  const groups = library.data?.groups || null;

  // Datos de la votación que se está editando o duplicando (o null).
  const [tpl] = useState(() => (edit ? editTemplate(edit.poll) : takeTemplate()));
  const editing = !!edit;
  const openCount = useOpenManaged();
  // Con un desempate (abierto o finalizado) solo se cambian el nombre y la descripción: el recuento ya está hecho.
  const nameOnly = !!edit?.poll.tiebreak;

  const [title, setTitle] = useState(tpl?.title || "");
  const [description, setDescription] = useState(tpl?.description || "");
  const [type, setType] = useState<PollType>(tpl?.type || "days");
  const [year, setYear] = useState(Math.max(now.getFullYear(), Number(tpl?.months[0]?.slice(0, 4)) || 0));
  const [months, setMonths] = useState<Set<string>>(() => new Set(tpl?.months));
  const [days, setDays] = useState<Set<string>>(() => new Set(tpl?.days));   // para "days" y "hours"
  const [weeks, setWeeks] = useState<Set<string>>(() => new Set(tpl?.weeks)); // lunes de cada semana
  const [count, setCount] = useState(tpl?.count || 1);
  const [opts, setOpts] = useState<Opt[]>(() => applyPresets(
    Array.from({ length: MAX_OPTIONS }, (_, i) => {
      const o = tpl?.opts[i];
      return { id: o?.id, name: o?.name || "", icon: o?.icon || "", touched: !!o?.icon };
    }), tpl?.count || 1));
  const [choices, setChoices] = useState<Choice[]>(() =>
    (tpl?.choices.length ? tpl.choices.map(c => newChoice(c)) : [newChoice(), newChoice()]));
  const [from, setFrom] = useState(tpl?.from || "09:00");
  const [to, setTo] = useState(tpl?.to || "21:00");
  const [step, setStep] = useState(tpl?.step || 60);
  const [hourMode, setHourMode] = useState<"range" | "list">(tpl?.hourMode || "range");
  const [hoursByDay, setHoursByDay] = useState<Record<string, string[]>>(tpl?.hoursByDay || {}); // horas sueltas, por día
  const [groupId, setGroupId] = useState(tpl?.groupId || lastGroup || "");
  const [newGroup, setNewGroup] = useState("");
  const [anonymous, setAnonymous] = useState(!!tpl?.anonymous);
  const [deadlineDay, setDeadlineDay] = useState("");   // "YYYY-MM-DD"; vacío = sin plazo. Una copia no hereda el plazo.
  const [deadlineTime, setDeadlineTime] = useState(""); // vacío = hasta el final de ese día
  const [access, setAccess] = useState<"open" | "approval" | "emails">(tpl?.access || "open");
  // Correos ya cerrados en burbujas y lo que queda a medio escribir (ver EmailChips).
  const [emailList, setEmailList] = useState(() => splitEmails(tpl?.emailsText || ""));
  const emailsText = joinEmails(emailList.emails, emailList.draft);
  const [maxText, setMaxText] = useState(tpl?.maxText || ""); // vacío = el tope general (MAX_PEOPLE)
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const last = useRef<string | null>(null); // última casilla pulsada (para rangos con Mayús)

  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  // La descripción crece con el texto (hasta unas 8 líneas), sin tirador.
  useAutoGrow(descRef, description, DESC_FIELD_MAX);
  const newGroupRef = useRef<HTMLInputElement>(null);
  const optRefs = useRef<(HTMLInputElement | null)[]>([]);
  const choiceRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusChoice = useRef<string | null>(null); // fila recién añadida, para llevarle el foco
  useEffect(() => {
    const k = focusChoice.current;
    if (k) { focusChoice.current = null; choiceRefs.current[k]?.focus(); }
  }, [choices]);

  // ---------- Al editar: lo que ya tiene votos no se puede quitar ----------
  const lockedSlots = new Set<string>(); // días (también en las de horas), semanas, meses u opciones libres con votos
  const lockedOpts = new Set<string>();  // opciones de cada día con votos
  const lockedHours = new Set<string>(); // «díaThora» con votos (votaciones por horas)
  if (edit) {
    for (const v of Object.values(edit.votes)) {
      for (const p of v?.picks || []) {
        const { slot, optId } = unitParts(p);
        if (edit.poll.type === "hours") { lockedHours.add(slot); lockedSlots.add(slot.split("T")[0]); }
        else lockedSlots.add(slot);
        lockedOpts.add(optId);
      }
    }
  }
  const LOCKED = "Lo que ya tiene votos no se puede quitar.";
  const lockTip = (on: boolean) => (on ? "Tiene votos: no se puede quitar" : undefined);
  // Leyenda del rojo suave con el que se marca, al editar, lo que ya tiene votos.
  const lockKey = (text: string) => <p className="lock-key"><span className="lock-key__swatch" aria-hidden="true"></span>{text}</p>;

  useEffect(() => { if (hasMouse()) titleRef.current?.focus(); }, []);
  useEffect(() => () => closeEmoji(), [closeEmoji]);

  // Si el grupo elegido ya no existe, se vuelve a "Sin grupo".
  const validGroupId = groups && groupId && groupId !== "__new" && !groups[groupId] ? "" : groupId;

  const sortedMonths = [...months].sort();
  const today = D.todayKey();
  const hourSlots = D.hourRange(from, to, step);
  const isList = hourMode === "list";
  const sortedHourDays = [...days].sort();
  const listHoursCount = sortedHourDays.reduce((a, d) => a + (hoursByDay[d]?.length || 0), 0);

  function addDayHour(day: string, h: string) {
    if (!h) return;
    setHoursByDay(m => {
      const cur = m[day] || [];
      if (cur.includes(h) || cur.length >= MAX_HOURS) return m;
      return { ...m, [day]: [...cur, h].sort() };
    });
  }

  function removeDayHour(day: string, h: string) {
    if (lockedHours.has(`${day}T${h}`)) { setStatus(`Las ${h} del ${D.fmtDayShort(day)} ya tienen votos: no se pueden quitar.`); return; }
    setHoursByDay(m => ({ ...m, [day]: (m[day] || []).filter(x => x !== h) }));
  }

  function selectableDays() {
    const out: string[] = [];
    sortedMonths.forEach(mk => {
      const { y, m } = D.parseMonth(mk);
      for (let d = 1, n = D.daysInMonth(y, m); d <= n; d++) {
        const k = D.dayKey(y, m, d);
        if (k >= today) out.push(k);
      }
    });
    return out;
  }

  function selectableWeeks() {
    const set = new Set<string>();
    sortedMonths.forEach(mk => {
      const { y, m } = D.parseMonth(mk);
      D.monthWeeks(y, m).forEach(w => { if (D.weekEndKey(w.key) >= today) set.add(w.key); });
    });
    return [...set].sort();
  }

  // Al quitar un mes, se quitan los días/semanas que ya no se ven (al editar, no si alguno tiene votos).
  function toggleMonth(k: string) {
    const nextMonths = toggled(months, k);
    const ok = new Set<string>();
    nextMonths.forEach(mk => { const { y, m } = D.parseMonth(mk); D.monthWeeks(y, m).forEach(w => ok.add(w.key)); });
    const loses = type === "months" ? lockedSlots.has(k) && !nextMonths.has(k)
      : type === "weeks" ? [...weeks].some(w => lockedSlots.has(w) && !ok.has(w))
      : [...days].some(d => lockedSlots.has(d) && !nextMonths.has(D.monthOfDay(d)));
    if (loses) { setStatus(`${D.cap(D.fmtMonth(k))} tiene votos: no se puede quitar.`); return; }
    setStatus("");
    setMonths(nextMonths);
    setDays(ds => new Set([...ds].filter(d => nextMonths.has(D.monthOfDay(d)))));
    setWeeks(ws => new Set([...ws].filter(w => ok.has(w))));
  }

  function toggleRange(set: Set<string>, key: string, ordered: string[], shift: boolean) {
    const next = new Set(set);
    const turnOn = !set.has(key);
    if (shift && last.current && last.current !== key) {
      let a = ordered.indexOf(last.current), b = ordered.indexOf(key);
      if (a > -1 && b > -1) {
        if (a > b) [a, b] = [b, a];
        ordered.slice(a, b + 1).forEach(k => (turnOn ? next.add(k) : next.delete(k)));
      }
    }
    turnOn ? next.add(key) : next.delete(key);
    last.current = key;
    // Al editar, lo que ya tiene votos se queda aunque caiga dentro del rango.
    let kept = false;
    set.forEach(k => { if (lockedSlots.has(k) && !next.has(k)) { next.add(k); kept = true; } });
    setStatus(kept ? LOCKED : "");
    return next;
  }

  function quick(kind: string) {
    // Al editar se quedan los ya pasados (no se pueden tocar) y los que tienen votos.
    const fixed = (s: Set<string>, past: (k: string) => boolean) => [...s].filter(k => lockedSlots.has(k) || past(k));
    if (type === "weeks") {
      setWeeks(new Set([...(kind === "all" ? selectableWeeks() : []), ...fixed(weeks, w => D.weekEndKey(w) < today)]));
    } else {
      const weekend = (k: string) => D.dowMon(D.parseDay(k)) >= 5;
      const pick: Record<string, (k: string) => boolean> = { all: () => true, none: () => false, weekdays: k => !weekend(k), weekends: weekend };
      setDays(new Set([...selectableDays().filter(pick[kind]), ...fixed(days, d => d < today)]));
    }
    last.current = null;
  }

  function changeCount(n: number) {
    const lost = opts.slice(n, count).find(o => o.id && lockedOpts.has(o.id));
    if (lost) { setStatus(`La opción «${lost.icon} ${lost.name}» ya tiene votos: no se puede quitar.`); return; }
    setStatus("");
    setCount(n);
    closeEmoji();
    setOpts(o => applyPresets(o, n));
  }

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOpts(o => o.map((x, j) => (j === i ? { ...x, ...patch, touched: x.touched || "icon" in patch } : x)));

  // ---------- Opciones libres ----------
  const setChoice = (key: string, patch: Partial<Choice>) =>
    setChoices(cs => cs.map(c => (c.key === key ? { ...c, ...patch } : c)));
  function addChoice() {
    if (choices.length >= MAX_CHOICES) return;
    const c = newChoice();
    focusChoice.current = c.key;
    setChoices(cs => [...cs, c]);
  }
  function removeChoice(c: Choice) {
    if (c.id && lockedSlots.has(c.id)) { setStatus(`La opción «${c.name}» ya tiene votos: no se puede quitar.`); return; }
    if (choices.length <= MIN_CHOICES) return;
    setStatus("");
    setChoices(cs => cs.filter(x => x.key !== c.key));
  }

  // ---------- Validación y envío ----------

  function validate(): [string, string] | null {
    if (!title.trim()) return ["Ponle un nombre a la votación.", "#f-title"];
    if (!editing && validGroupId === "__new" && !newGroup.trim()) return ["Escribe el nombre del grupo nuevo (o elige otro).", "#f-newgroup"];
    if (nameOnly) return null;
    if (type === "options") {
      const empty = choices.findIndex(c => !c.name.trim());
      if (empty >= 0) return [`Ponle nombre a la opción ${empty + 1} o quítala.`, `[data-choice="${empty}"]`];
      if (choices.length < MIN_CHOICES) return [`Escribe al menos ${MIN_CHOICES} opciones.`, "#sec-choices"];
      const seen = new Map<string, number>();
      for (const [i, c] of choices.entries()) {
        const k = c.name.trim().toLocaleLowerCase("es");
        if (seen.has(k)) return [`Las opciones ${seen.get(k)! + 1} y ${i + 1} se llaman igual.`, `[data-choice="${i}"]`];
        seen.set(k, i);
      }
      return null;
    }
    if (!months.size) return ["Elige al menos un mes.", "#sec-months"];
    if ((type === "days" || type === "hours") && !days.size) return ["Elige al menos un día.", "#sec-slots"];
    if (type === "weeks" && !weeks.size) return ["Elige al menos una semana.", "#sec-slots"];
    if (type === "days") {
      for (let i = 0; i < count; i++) {
        if (!opts[i].icon) return [`Elige un icono para la opción ${i + 1}.`, "#sec-opts"];
        if (!opts[i].name.trim()) return [`Ponle nombre a la opción ${i + 1}.`, `[data-opt-name="${i}"]`];
      }
    }
    if (type === "hours" && !isList && !hourSlots.length) return ["El rango de horas no contiene ninguna franja.", "#sec-hours"];
    if (type === "hours" && isList) {
      const missing = sortedHourDays.find(d => !(hoursByDay[d]?.length));
      if (missing) return [`Añade al menos una hora para el ${D.cap(D.fmtDayShort(missing))}.`, "#sec-hours"];
    }
    if (editing) return null; // el acceso, el plazo y el máximo se cambian desde la votación
    if (access === "emails") {
      if (parsed.invalid.length) return [`Revisa ${parsed.invalid.length === 1 ? "este correo" : "estos correos"}: ${parsed.invalid.slice(0, 3).join(", ")}${parsed.invalid.length > 3 ? "…" : ""}`, "#f-emails"];
      if (!parsed.emails.length) return ["Escribe al menos un correo que pueda entrar.", "#f-emails"];
      if (parsed.emails.length > MAX_EMAILS) return [`Como mucho ${MAX_EMAILS} correos.`, "#f-emails"];
    }
    if (deadlineDay && (deadlineTs === null || deadlineTs <= Date.now())) return ["El plazo para votar tiene que ser posterior a ahora.", "#f-deadline"];
    if (maxText.trim() && maxPeople === null) return [`El máximo de personas debe ser un número entre 2 y ${MAX_PEOPLE}.`, "#f-max"];
    return null;
  }

  // Plazo para votar: el final del día elegido si no se pone hora (null = sin plazo o día no válido).
  const deadlineTs = (() => {
    if (!deadlineDay) return null;
    const dt = D.parseDay(deadlineDay);
    if (Number.isNaN(dt.getTime())) return null;
    const [h, m] = deadlineTime ? deadlineTime.split(":").map(Number) : [23, 59];
    dt.setHours(h, m, 0, 0);
    return dt.getTime();
  })();

  // Quién puede unirse: correos leídos del texto y tope de personas (null = vacío o no válido).
  const parsed = parseEmails(emailsText);
  const maxPeople = (() => {
    const t = maxText.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isInteger(n) && n >= 2 && n <= MAX_PEOPLE ? n : null;
  })();

  // Qué se vota: casillas, horas y opciones, tal como se guardan.
  function structure(): Pick<PollData, "months" | "slots" | "hours" | "hourStep" | "hourList" | "hoursByDay" | "options"> {
    // Las opciones ya guardadas conservan su id (los votos van a él); las nuevas toman uno que no haya usado
    // nunca la votación (tampoco una opción que se acaba de quitar: sería otra opción con el mismo id).
    const used = new Set([...opts.map(o => o.id), ...choices.map(c => c.id), ...(edit?.poll.options || []).map(o => o.id)]
      .filter((x): x is string => !!x));
    const choiceOpts = choices.map(c => ({ id: c.id || freshId("c", used), name: c.name.trim(), icon: c.icon || DEFAULT_CHOICE_ICON }));
    return {
      months: type === "options" ? [] : sortedMonths,
      slots: type === "options" ? choiceOpts.map(o => o.id)
        : type === "months" ? sortedMonths : type === "weeks" ? [...weeks].sort() : [...days].sort(),
      hours: type === "hours" && !isList ? hourSlots : [],
      hourStep: type === "hours" && !isList ? step : 0,
      ...(type === "hours" && isList
        ? { hourList: true, hoursByDay: Object.fromEntries(sortedHourDays.map(d => [d, hoursByDay[d] || []])) }
        : {}),
      options: type === "days"
        ? opts.slice(0, count).map(o => ({ id: o.id || freshId("o", used), name: o.name.trim(), icon: o.icon }))
        : type === "options" ? choiceOpts : [],
    };
  }

  function showError(err: [string, string]) {
    setStatus(err[0]);
    const el = root.current?.querySelector<HTMLElement>(err[1]);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el.matches("input, textarea")) el.focus({ preventScroll: true });
    }
  }

  // Guarda la edición: solo los campos que cambian, y un aviso en el chat por cada cambio.
  /** Cómo quedaría la votación con lo editado y qué campos cambian (vacío si no se ha cambiado nada). */
  function editChanges(target: EditTarget) {
    const old = target.poll;
    const next: PollData = { ...old, title: title.trim(), description: description.trim(), ...(nameOnly ? {} : structure()) };
    const keys = ["title", "description", "months", "slots", "hours", "hourStep", "hoursByDay", "options"] as const;
    const patch: Partial<PollData> = {};
    for (const k of keys) {
      if (JSON.stringify(old[k] ?? null) !== JSON.stringify(next[k] ?? null)) (patch as Record<string, unknown>)[k] = next[k];
    }
    return { old, next, patch };
  }

  // Cancelar la edición: vuelve a la votación sin guardar; si hay cambios, pregunta antes de descartarlos.
  async function cancelEdit(target: EditTarget) {
    if (busy) return;
    if (Object.keys(editChanges(target).patch).length && !(await confirm({
      title: "¿Descartar los cambios?",
      message: "Se perderá lo que has cambiado y la votación se quedará como estaba.",
      confirmLabel: "Descartar cambios",
      cancelLabel: "Seguir editando",
      danger: true,
    }))) return;
    navigate(`/v/${target.id}`);
  }

  async function saveEdit(target: EditTarget) {
    const { old, next, patch } = editChanges(target);
    // Por si alguien ha votado mientras se editaba: lo que ya tiene votos no se puede quitar.
    const lost = lostVotedUnit(old, next, target.votes);
    if (lost) { setStatus(`«${unitLabel(old, lost)}» ya tiene votos: no se puede quitar.`); return; }
    if (!Object.keys(patch).length) { toast("No has cambiado nada"); navigate(`/v/${target.id}`); return; }
    setBusy(true);
    try {
      await store.updatePoll(target.id, patch);
    } catch (e) {
      setStatus("No se pudieron guardar los cambios. " + errMsg(e));
      setBusy(false);
      return;
    }
    const at = Date.now();
    const notes = describeChanges(old, next);
    try {
      for (const [i, text] of notes.entries()) {
        await store.sendChat(target.id, { uid: user.uid, name: user.name, text, at: at + i, sys: true });
      }
    } catch {
      toast("Cambios guardados, pero no se pudieron avisar en el chat");
      navigate(`/v/${target.id}`);
      return;
    }
    toast(notes.length ? "Cambios guardados y avisados en el chat" : "Cambios guardados");
    navigate(`/v/${target.id}`);
  }

  async function submit() {
    if (busy) return;
    const err = validate();
    if (err) { showError(err); return; }
    setStatus("");
    if (edit) { await saveEdit(edit); return; }
    const createdAt = Date.now();
    const poll: PollData = {
      v: 1,
      title: title.trim(),
      description: description.trim(),
      type,
      ...structure(),
      anonymous,
      ...(deadlineTs ? { deadline: deadlineTs } : {}),
      maxPeople: maxPeople ?? MAX_PEOPLE,
      members: 0,
      approval: access === "approval",
      emailsOnly: access === "emails",
      ownerUid: user.uid,
      ownerName: user.name,
      createdAt,
      closed: false,
    };
    setBusy(true);
    try {
      let gid: string | null = validGroupId || null;
      if (gid === "__new") gid = await store.createGroup(user.uid, newGroup.trim());
      const acc: PollAccess | null = access === "emails" ? { emails: parsed.emails } : null;
      const id = await store.createPoll(poll, acc);
      if (!editing && tpl?.duplicated) store.track("duplicate");
      await store.saveLibraryEntry(user.uid, id, {
        title: poll.title, type: poll.type, role: "owner", ownerName: poll.ownerName,
        groupId: gid, addedAt: createdAt,
      });
      setLastGroup(gid || "");
      toast("¡Votación creada! Compártela con el botón «Compartir».");
      navigate(`/v/${id}`);
    } catch (e) {
      setStatus("No se pudo crear la votación. " + errMsg(e));
      setBusy(false);
    }
  }

  // ---------- Secciones ----------

  // Al editar no se cambia el tipo; el acceso, el plazo y la privacidad tienen su sitio en la votación.
  const structural = !nameOnly;
  const visible = {
    name: true,
    type: !editing,
    months: structural && type !== "options",
    slots: structural && type !== "months" && type !== "options",
    opts: structural && type === "days",
    hours: structural && type === "hours",
    choices: structural && type === "options",
    privacy: !editing,
    deadline: !editing,
    access: !editing,
  };
  const numbers: Partial<Record<keyof typeof visible, number>> = {};
  let n = 0;
  for (const [k, v] of Object.entries(visible)) if (v) numbers[k as keyof typeof visible] = ++n;

  const cur = D.currentMonthKey();
  const minYear = now.getFullYear();
  const isWeeks = type === "weeks";

  const typeCard = (on: boolean, icon: IconName, name: string, desc: string, onClick: () => void, key: string, premium?: PremiumFeature) => (
    <button key={key} type="button" className={`type-card ${on ? "type-card--on" : ""}`} aria-pressed={on} onClick={onClick}>
      <span className="type-card__icon"><Icon name={icon} /></span>
      {/* En la esquina, lejos del centro: tocar la tarjeta la elige; tocar la etiqueta, la explica. */}
      {premium && <PremiumTag feature={premium} nested className="type-card__premium" />}
      <span className="type-card__name">{name}</span>
      <span className="type-card__desc">{desc}</span>
    </button>
  );

  const summaryParts = [TYPE[type].name];
  if (type === "options") summaryParts.push(plural(choices.length, ["opción", "opciones"]));
  else if (type === "months") summaryParts.push(plural(months.size, ["mes", "meses"]));
  else if (type === "weeks") summaryParts.push(plural(weeks.size, ["semana", "semanas"]));
  else summaryParts.push(plural(days.size, ["día", "días"]));
  if (type === "days") summaryParts.push(plural(count, ["opción", "opciones"]) + " por día");
  if (type === "hours") summaryParts.push(isList
    ? plural(listHoursCount, ["hora", "horas"]) + " en total"
    : plural(hourSlots.length, ["franja", "franjas"]) + " por día");
  if (!editing) {
    summaryParts.push(anonymous ? "anónima" : "votos visibles");
    if (deadlineTs) summaryParts.push(`hasta el ${fmtDeadline(deadlineTs)}`);
    if (access === "emails") summaryParts.push(`solo ${plural(parsed.emails.length, ["correo", "correos"])}`);
    if (access === "approval") summaryParts.push("con aprobación");
    summaryParts.push(`máx. ${maxPeople ?? MAX_PEOPLE} personas`);
  }

  const starts: string[] = [], ends: string[] = [];
  for (let t = 0; t < 1440; t += 30) starts.push(D.hhmm(t));
  for (let t = 30; t <= 1440; t += 30) ends.push(D.hhmm(t));

  const shownOpts = opts.slice(0, count);

  return (
    <>
      <div className="page-head">
        <a className="page-head__back" href={edit ? `#/v/${edit.id}` : "#/"}><Icon name="back" /> Volver</a>
        <h1 className="page-head__title">{editing ? "Editar votación" : "Nueva votación"}</h1>
        {editing && (
          <p className="subtitle">
            {nameOnly
              ? "Hay un desempate, así que solo se pueden cambiar el nombre y la descripción."
              : <>Puedes añadir {type === "options" ? "opciones" : type === "hours" ? "días y horas" : type === "days" ? "días y opciones" : TYPE[type].unit[1]}, pero
                no quitar lo que ya tiene votos. El tipo de votación no se cambia: para eso, duplícala <PremiumTag feature="duplicate" />.</>}
            {" "}Cada cambio se avisará en el chat.
          </p>
        )}
        {!editing && tpl?.duplicated && (
          <p className="subtitle">
            Es una copia de otra votación, sin sus votos ni las fechas que ya han pasado. Revísala y pulsa «Crear
            votación». <PremiumTag feature="duplicate" />
          </p>
        )}
        {!editing && openCount !== null && openCount >= FREE_OPEN && (
          <p className="subtitle">
            Ya tienes {openCount} votaciones abiertas. Tener más de {FREE_OPEN} abiertas a la vez: <PremiumTag feature="open" />
          </p>
        )}
        {!editing && user.anon && store.mode === "firebase" && (
          <p className="subtitle subtitle--anon">
            Has entrado sin cuenta: para gestionar esta votación (cerrarla, desempatar o eliminarla) desde otro
            dispositivo o después de cerrar sesión, necesitarás tu clave de acceso. Si prefieres no depender de ella,
            guarda tu cuenta con tu correo o con Google en <a href="#/perfil">«Tu perfil»</a>.
          </p>
        )}
      </div>
      <div className="create" ref={root}>
        <section className="step" id="sec-name">
          <h2 className="step__title"><span className="step__num">{numbers.name}</span>Nombre</h2>
          <div className="emoji-field">
            <input ref={titleRef} id="f-title" className="input input--big emoji-field__input" maxLength={120} placeholder="Ej.: Cena de Navidad 2026 🎄"
              autoComplete="off" value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} />
            <EmojiButton field={() => titleRef.current} setValue={setTitle} />
          </div>
          <div className="emoji-field emoji-field--area">
            <textarea ref={descRef} className="input input--area emoji-field__input" maxLength={MAX_DESCRIPTION} rows={2} placeholder="Descripción (opcional)"
              value={description} onChange={e => setDescription(e.target.value)} />
            <EmojiButton field={() => descRef.current} setValue={setDescription} />
          </div>
          <CharCount value={description} max={MAX_DESCRIPTION} />
          <div className="create__group" hidden={editing}>
            <label htmlFor="f-group">Guardar en el grupo</label>
            <GroupSelect id="f-group" className="input create__group-select" groups={groups} value={validGroupId}
              extra={[{ value: "__new", label: "＋ Crear grupo nuevo…" }]}
              onChange={v => {
                setGroupId(v);
                if (v === "__new") requestAnimationFrame(() => newGroupRef.current?.focus());
              }} />
            <input ref={newGroupRef} id="f-newgroup" className="input create__group-input" maxLength={40} placeholder="Nombre del nuevo grupo" autoComplete="off"
              hidden={validGroupId !== "__new"} value={newGroup} onChange={e => setNewGroup(e.target.value)} />
          </div>
        </section>

        <section className="step" id="sec-type" hidden={!visible.type}>
          <h2 className="step__title"><span className="step__num">{numbers.type}</span>¿Qué se vota?</h2>
          <div className="create__types">
            {TYPES.map(t => typeCard(type === t.id, t.icon, t.name, t.desc, () => {
              if (type === t.id) return;
              setType(t.id);
              last.current = null;
            }, t.id))}
          </div>
        </section>

        <section className="step" id="sec-months" hidden={!visible.months}>
          <h2 className="step__title"><span className="step__num">{numbers.months}</span>Meses</h2>
          <p className="hint">
            {type === "months"
              ? "Elige los meses que se podrán votar. Cambia de año con las flechas."
              : `Elige el mes o los meses en los que estarán ${isWeeks ? "las semanas" : "los días"} de la votación. Cambia de año con las flechas.`}
          </p>
          <div>
            <div className="year-nav">
              <button type="button" className="icon-btn" disabled={year <= minYear} aria-label="Año anterior" onClick={() => setYear(y => y - 1)}>‹</button>
              <strong>{year}</strong>
              <button type="button" className="icon-btn" disabled={year >= minYear + 3} aria-label="Año siguiente" onClick={() => setYear(y => y + 1)}>›</button>
            </div>
            <div className="create__months">
              {D.MNAMES.map((name, m) => {
                const k = D.monthKey(year, m);
                return (
                  <button key={k} type="button" className={cls("chip month-chip", months.has(k) && "chip--on", type === "months" && lockedSlots.has(k) && "month-chip--locked")}
                    data-tip={lockTip(type === "months" && lockedSlots.has(k))}
                    aria-pressed={months.has(k)} disabled={k < cur} onClick={() => toggleMonth(k)}>{D.cap(name)}</button>
                );
              })}
            </div>
            {type === "months" && lockedSlots.size > 0 && lockKey("En rojo, los meses que ya tienen votos: no se pueden quitar.")}
            <div className="create__selected-months">
              {sortedMonths.length
                ? sortedMonths.map(k => (
                  <span key={k} className="tag">{D.cap(D.fmtMonth(k))}
                    {k >= cur && <button type="button" className="tag__remove" aria-label={`Quitar ${D.fmtMonth(k)}`} onClick={() => toggleMonth(k)}>×</button>}
                  </span>
                ))
                : <span className="muted">Ningún mes seleccionado.</span>}
            </div>
          </div>
        </section>

        <section className="step" id="sec-slots" hidden={!visible.slots}>
          <h2 className="step__title"><span className="step__num">{numbers.slots}</span><span>{isWeeks ? "Semanas" : "Días"}</span></h2>
          <p className="hint">
            {!sortedMonths.length ? "" : isWeeks
              ? "Pulsa en las semanas que se podrán votar. Una semana que cae entre dos meses es la misma en los dos calendarios."
              : `Pulsa en los días que se podrán votar${type === "hours" ? " (en cada uno se votarán las horas)" : ""}. En ordenador, mantén Mayús para marcar un rango.`}
          </p>
          <div>
            {visible.slots && (!sortedMonths.length
              ? <div className="empty-box">Primero elige al menos un mes.</div>
              : <>
                <div className="create__quick">
                  {isWeeks ? <>
                    <button type="button" className="chip" onClick={() => quick("all")}>Todas</button>
                    <button type="button" className="chip" onClick={() => quick("none")}>Ninguna</button>
                  </> : <>
                    <button type="button" className="chip" onClick={() => quick("all")}>Todos</button>
                    <button type="button" className="chip" onClick={() => quick("none")}>Ninguno</button>
                    <button type="button" className="chip" onClick={() => quick("weekdays")}>Lunes a viernes</button>
                    <button type="button" className="chip" onClick={() => quick("weekends")}>Fines de semana</button>
                  </>}
                  <span className="create__count">
                    {plural(isWeeks ? weeks.size : days.size, isWeeks ? ["semana seleccionada", "semanas seleccionadas"] : ["día seleccionado", "días seleccionados"])}
                  </span>
                </div>
                {lockedSlots.size > 0 && lockKey(`En rojo, ${isWeeks ? "las semanas" : "los días"} que ya tienen votos: no se pueden quitar.`)}
                <div className="picker">
                  {sortedMonths.map(mk => {
                    const { y, m } = D.parseMonth(mk);
                    if (isWeeks) {
                      return (
                        <div key={mk} className="picker__month">
                          <h3 className="picker__month-title">{D.fmtMonth(mk)}</h3>
                          <div className="picker__week-head"><span></span>{D.DOW.map(x => <span key={x}>{x}</span>)}</div>
                          <div className="picker__weeks">
                            {D.monthWeeks(y, m).map(w => (
                              <button key={w.key} type="button" className={cls("picker__week", weeks.has(w.key) && "picker__week--on", lockedSlots.has(w.key) && "picker__week--locked")} data-tip={lockTip(lockedSlots.has(w.key))} aria-pressed={weeks.has(w.key)}
                                disabled={D.weekEndKey(w.key) < today}
                                onClick={(e: MouseEvent) => setWeeks(toggleRange(weeks, w.key, selectableWeeks(), e.shiftKey))}>
                                <span className="picker__week-num">S{w.num}</span>
                                {w.days.map(d => <span key={d.key} className={bem("picker__week-day", { out: !d.inMonth })}>{d.d}</span>)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    const cells = D.DOW.map(x => <div key={`h${x}`} className="picker__dow">{x}</div>);
                    for (let i = 0, first = D.dowMon(new Date(y, m, 1)); i < first; i++) cells.push(<div key={`e${i}`}></div>);
                    for (let d = 1, nd = D.daysInMonth(y, m); d <= nd; d++) {
                      const k = D.dayKey(y, m, d);
                      const we = D.dowMon(new Date(y, m, d)) >= 5;
                      cells.push(
                        <button key={k} type="button" className={cls("picker__day", days.has(k) && "picker__day--on", we && "picker__day--we", lockedSlots.has(k) && "picker__day--locked")} data-tip={lockTip(lockedSlots.has(k))} aria-pressed={days.has(k)}
                          disabled={k < today} onClick={(e: MouseEvent) => setDays(toggleRange(days, k, selectableDays(), e.shiftKey))}>{d}</button>,
                      );
                    }
                    return <div key={mk} className="picker__month"><h3 className="picker__month-title">{D.fmtMonth(mk)}</h3><div className="picker__grid">{cells}</div></div>;
                  })}
                </div>
              </>)}
          </div>
        </section>

        <section className="step" id="sec-opts" hidden={!visible.opts}>
          <h2 className="step__title"><span className="step__num">{numbers.opts}</span>Opciones de cada día</h2>
          <p className="hint">
            Cada día puede tener hasta 4 opciones (por ejemplo, comida y cena). El icono se verá en el calendario y el nombre en la leyenda.
            {lockedOpts.size > 0 && type === "days" && " Las que ya tienen votos (en rojo) se pueden renombrar, pero no quitar."}
          </p>
          <div>
            {visible.opts && <>
              <div className="seg" role="group" aria-label="Opciones por día">
                {[1, 2, 3, 4].map(k => (
                  <button key={k} type="button" className={bem("seg__btn", { on: count === k })} aria-pressed={count === k} onClick={() => changeCount(k)}>{k}</button>
                ))}
                <span className="seg__label">{count === 1 ? "opción" : "opciones"} por día</span>
              </div>
              <div className="opt-editor">
                <div className="opt-editor__rows">
                  {shownOpts.map((o, i) => (
                    <div key={i} className={cls("opt-editor__row", !!o.id && lockedOpts.has(o.id) && "opt-editor__row--locked")} data-tip={lockTip(!!o.id && lockedOpts.has(o.id))}>
                      <span className={`opt-editor__swatch swatch swatch--c${i}`}></span>
                      <button type="button" className="icon-pick opt-editor__icon" aria-label={`Elegir icono de la opción ${i + 1}`} aria-expanded="false" data-tip="Elegir icono"
                        onClick={e => {
                          const anchor = e.currentTarget;
                          openEmoji({ anchor, onPick: emoji => { setOpt(i, { icon: emoji }); anchor.focus(); } });
                        }}>{o.icon || <Icon name="plus" />}</button>
                      <div className="emoji-field opt-editor__field">
                        <input ref={el => { optRefs.current[i] = el; }} className="input emoji-field__input opt-editor__input" id={`f-opt-${i}`} data-opt-name={i} maxLength={30}
                          value={o.name} placeholder={`Ej.: ${PRESETS[count][i][0]}`} aria-label={`Nombre de la opción ${i + 1}`} autoComplete="off"
                          onChange={e => setOpt(i, { name: e.target.value })} />
                        <EmojiButton field={() => optRefs.current[i]} setValue={v => setOpt(i, { name: v })} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="opt-editor__preview">
                  <div className="opt-editor__preview-label">Vista previa</div>
                  <div className={`cell cell--n${count} cell--preview`}>
                    <div className="cell__day">22</div>
                    {shownOpts.map((o, i) => (
                      <span key={i} className={bem("cell__opt", { [`c${i}`]: true, on: i % 2 === 0 })}>
                        <span className="cell__label">{o.icon}</span><span className="count">{[3, 1, 2, 0][i]}</span>
                      </span>
                    ))}
                  </div>
                  <div className="legend legend--mini">
                    {shownOpts.map((o, i) => (
                      <span key={i} className="legend__item"><span className={`swatch swatch--c${i}`}></span>{o.icon} {o.name || <em className="muted">{PRESETS[count][i][0]}</em>}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>}
          </div>
        </section>

        <section className="step" id="sec-hours" hidden={!visible.hours}>
          <h2 className="step__title"><span className="step__num">{numbers.hours}</span>Horas</h2>
          <div className="create__hour-mode" role="group" aria-label="Cómo se eligen las horas">
            <button type="button" className={cls("chip", !isList && "chip--on")} aria-pressed={!isList} disabled={editing && isList} onClick={() => setHourMode("range")}>Franjas periódicas</button>
            <button type="button" className={cls("chip", isList && "chip--on")} aria-pressed={isList} disabled={editing && !isList} onClick={() => setHourMode("list")}>Horas sueltas</button>
          </div>
          <p className="hint">
            {isList
              ? "Elige, para cada día, las horas concretas que se podrán votar. Pueden ser distintas en cada día (por ejemplo, 18:00 y 18:30 uno y 19:00 otro)."
              : "Las mismas franjas se repetirán en cada uno de los días elegidos."}
          </p>
          <div>
            {visible.hours && isList && <>
              {!sortedHourDays.length
                ? <div className="empty-box">Primero elige los días en el paso «{numbers.slots}. Días».</div>
                : <div className="hour-days">
                  {sortedHourDays.map(d => {
                    const chosen = hoursByDay[d] || [];
                    return (
                      <div key={d} className="hour-days__row">
                        <div className="hour-days__head">
                          <span className="hour-days__label">{D.cap(D.fmtDayShort(d))}</span>
                          <HourDropdown day={d} options={starts} chosen={chosen}
                            onToggle={h => (chosen.includes(h) ? removeDayHour(d, h) : addDayHour(d, h))} />
                        </div>
                        <div className="hour-chips hour-days__chips">
                          {chosen.length
                            ? chosen.map(h => (
                              <span key={h} className={cls("tag hour-chips__tag", lockedHours.has(`${d}T${h}`) && "tag--locked")}
                                data-tip={lockTip(lockedHours.has(`${d}T${h}`))}>{h}
                                {!lockedHours.has(`${d}T${h}`) && (
                                  <button type="button" className="tag__remove" aria-label={`Quitar las ${h} del ${D.fmtDayShort(d)}`} onClick={() => removeDayHour(d, h)}>×</button>
                                )}
                              </span>
                            ))
                            : <span className="muted">Todavía no hay ninguna hora.</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>}
              <p className="hint hint--after">{plural(listHoursCount, ["hora", "horas"])} en total.</p>
            </>}
            {visible.hours && !isList && <>
              <div className="hours-form">
                <label className="hours-form__field">Desde<select className="input" value={from} onChange={e => setFrom(e.target.value)}>
                  {starts.map(v => <option key={v} value={v}>{v}</option>)}
                </select></label>
                <label className="hours-form__field">Hasta<select className="input" value={to} onChange={e => setTo(e.target.value)}>
                  {ends.map(v => <option key={v} value={v}>{v}</option>)}
                </select></label>
                <label className="hours-form__field">Cada<select className="input" value={step} disabled={editing} onChange={e => setStep(Number(e.target.value))}>
                  {([[30, "30 minutos"], [60, "1 hora"], [120, "2 horas"]] as const).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              </div>
              <div className="hour-chips">
                {hourSlots.length
                  ? hourSlots.map(h => <span key={h} className="chip chip--static">{h}</span>)
                  : <span className="status">Con ese rango no cabe ninguna franja.</span>}
              </div>
              <p className="hint hint--after">
                {plural(hourSlots.length, ["franja", "franjas"])} por día.
                {editing && " La duración de cada franja no se puede cambiar; las franjas que ya tienen votos tienen que quedar dentro del rango."}
              </p>
            </>}
          </div>
        </section>

        <section className="step" id="sec-choices" hidden={!visible.choices}>
          <h2 className="step__title"><span className="step__num">{numbers.choices}</span>Opciones</h2>
          <p className="hint">
            Escribe las opciones que se podrán votar, de {MIN_CHOICES} a {MAX_CHOICES}. El icono es opcional: si no eliges
            ninguno, se pone {DEFAULT_CHOICE_ICON}.{lockedSlots.size > 0 && type === "options" && " Las que ya tienen votos (en rojo) se pueden renombrar, pero no quitar."}
          </p>
          {visible.choices && <>
            <div className="opt-editor__rows">
              {choices.map((c, i) => {
                const locked = !!c.id && lockedSlots.has(c.id);
                return (
                  <div key={c.key} className={cls("opt-editor__row opt-editor__row--choice", locked && "opt-editor__row--locked")} data-tip={lockTip(locked)}>
                    <button type="button" className={cls("icon-pick opt-editor__icon", !c.icon && "icon-pick--default")} aria-label={`Elegir icono de la opción ${i + 1}`}
                      aria-expanded="false" data-tip="Elegir icono (opcional)"
                      onClick={e => {
                        const anchor = e.currentTarget;
                        openEmoji({ anchor, onPick: emoji => { setChoice(c.key, { icon: emoji }); anchor.focus(); } });
                      }}>{c.icon || DEFAULT_CHOICE_ICON}</button>
                    <div className="emoji-field opt-editor__field">
                      <input ref={el => { choiceRefs.current[c.key] = el; }} className="input emoji-field__input opt-editor__input" data-choice={i} maxLength={60}
                        value={c.name} placeholder={i < CHOICE_EXAMPLES.length ? `Ej.: ${CHOICE_EXAMPLES[i]}` : "Otra opción"}
                        aria-label={`Nombre de la opción ${i + 1}`} autoComplete="off"
                        onChange={e => setChoice(c.key, { name: e.target.value })}
                        onKeyDown={e => {
                          // Intro en la última fila añade otra, como en una lista.
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          if (i === choices.length - 1 && c.name.trim()) addChoice();
                          else if (i < choices.length - 1) choiceRefs.current[choices[i + 1].key]?.focus();
                        }} />
                      <EmojiButton field={() => choiceRefs.current[c.key]} setValue={v => setChoice(c.key, { name: v })} />
                    </div>
                    <button type="button" className="icon-btn opt-editor__del" aria-label={`Quitar la opción ${i + 1}`}
                      data-tip={locked ? "Tiene votos: no se puede quitar" : "Quitar la opción"}
                      disabled={locked || choices.length <= MIN_CHOICES} onClick={() => removeChoice(c)}>
                      <Icon name="close" />
                    </button>
                  </div>
                );
              })}
            </div>
            {choices.length < MAX_CHOICES && (
              <button type="button" className="btn btn--small opt-editor__add" onClick={addChoice}><Icon name="plus" /> Añadir opción</button>
            )}
            <p className="hint hint--after">{plural(choices.length, ["opción", "opciones"])} de {MAX_CHOICES} como mucho.</p>
          </>}
        </section>

        <section className="step" id="sec-privacy" hidden={!visible.privacy}>
          <h2 className="step__title"><span className="step__num">{numbers.privacy}</span>¿Quién ve los votos?</h2>
          <div className="create__privacy">
            {typeCard(!anonymous, "eye", "Votos visibles", "Cada participante puede ver qué ha votado cada persona.", () => setAnonymous(false), "vis")}
            {typeCard(anonymous, "incognito", "Anónima", "Solo se ven los totales. Más adelante no se podrá hacer visible.", () => setAnonymous(true), "anon")}
          </div>
        </section>

        <section className="step" id="sec-deadline" hidden={!visible.deadline}>
          <h2 className="step__title"><span className="step__num">{numbers.deadline}</span>¿Hasta cuándo se vota? <PremiumTag feature="deadline" /></h2>
          <p className="hint">
            Opcional. Al llegar el plazo, la votación deja de admitir votos y tú decides si la cierras o quitas el
            plazo. Si lo dejas vacío, sigue abierta hasta que la cierres.
          </p>
          <div className="deadline-form">
            <label className="deadline-form__field" htmlFor="f-deadline">Último día
              <input id="f-deadline" className="input" type="date" min={today} value={deadlineDay}
                onChange={e => setDeadlineDay(e.target.value)} />
            </label>
            <label className="deadline-form__field" htmlFor="f-deadline-time">Hora <span className="muted">(opcional)</span>
              <input id="f-deadline-time" className="input" type="time" step={300} value={deadlineTime}
                disabled={!deadlineDay} onChange={e => setDeadlineTime(e.target.value)} />
            </label>
            {deadlineDay && (
              <button type="button" className="link-btn deadline-form__clear" onClick={() => { setDeadlineDay(""); setDeadlineTime(""); }}>
                Quitar el plazo
              </button>
            )}
          </div>
          {!!deadlineTs && <p className="hint hint--after">Se podrá votar hasta el {fmtDeadline(deadlineTs)}.</p>}
        </section>

        <section className="step" id="sec-access" hidden={!visible.access}>
          <h2 className="step__title"><span className="step__num">{numbers.access}</span>¿Quién puede unirse?</h2>
          <div className="create__access">
            {typeCard(access === "open", "link", "Cualquiera con el enlace", "Quien abra el enlace entra y vota.", () => setAccess("open"), "open")}
            {typeCard(access === "approval", "approve", "Con tu aprobación", "Quien entre verá la votación, pero no podrá votar hasta que le aceptes.", () => setAccess("approval"), "approval", "approval")}
            {typeCard(access === "emails", "mail", "Solo estos correos", "Privada: solo entran las cuentas de Google que indiques.", () => setAccess("emails"), "emails", "emails")}
          </div>
          {access === "emails" && (
            <div className="create__access-emails">
              <label className="field-label" htmlFor="f-emails">Correos que pueden entrar</label>
              <EmailChips id="f-emails" emails={emailList.emails} draft={emailList.draft} describedBy="f-emails-hint"
                onChange={(emails, draft) => setEmailList({ emails, draft })} placeholder="ana@gmail.com" />
              <p id="f-emails-hint" className="hint create__access-hint">
                Escribe un correo y pulsa Intro (o una coma) para añadir el siguiente. Tú siempre puedes entrar.
                {emailList.emails.length > 0 && <> <strong>{plural(emailList.emails.length, ["correo", "correos"])}</strong>.</>}
                {store.mode === "demo" && <> En el modo demo, el correo de cada persona es su nombre@demo.test (por ejemplo, ana@demo.test).</>}
              </p>
            </div>
          )}
          <div className="create__access-max">
            <label className="field-label" htmlFor="f-max">Máximo de personas <span className="muted">(contándote a ti)</span></label>
            <input id="f-max" className="input input--small create__max-input" type="number" inputMode="numeric" min={2} max={MAX_PEOPLE}
              value={maxText} onChange={e => setMaxText(e.target.value)} placeholder={String(MAX_PEOPLE)} />
            <p className="hint create__access-hint">
              Si lo dejas vacío, pueden unirse hasta {MAX_PEOPLE} personas, el límite de cualquier votación. Más
              de {FREE_PEOPLE} personas: <PremiumTag feature="people" />
            </p>
          </div>
          <PremiumNote />
        </section>

        <div className="create-bar">
          <div className="create-bar__summary"><Icon name={TYPE[type].icon} /> {summaryParts.join(" · ")}</div>
          <div className="create-bar__actions">
            {edit && <button type="button" className="btn btn--big create-bar__btn" disabled={busy} onClick={() => cancelEdit(edit)}>Cancelar</button>}
            <button type="button" className="btn btn--primary btn--big create-bar__btn" disabled={busy} onClick={submit}>
              {busy && <Spinner />}
              {editing ? (busy ? "Guardando…" : "Guardar cambios") : (busy ? "Creando…" : "Crear votación")}
            </button>
          </div>
          <div className="status create-bar__status" role="alert">{status}</div>
        </div>
      </div>
    </>
  );
}
