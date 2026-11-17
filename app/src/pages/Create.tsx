// Pantalla "Nueva votación".
import { useEffect, useRef, useState, type MouseEvent } from "react";
import * as D from "../lib/dates";
import { TYPES, TYPE, MAX_OPTIONS, MAX_PEOPLE, MAX_EMAILS, parseEmails, plural, fmtDeadline } from "../lib/model";
import type { PollAccess, PollData, PollType } from "../lib/types";
import { cls, errMsg } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { navigate } from "../state/route";
import { GroupSelect } from "../components/GroupSelect";

// Ejemplos según el número de opciones: el nombre solo se muestra como placeholder (no se rellena)
// y el icono se propone mientras no se haya elegido otro.
const PRESETS: Record<number, [string, string][]> = {
  1: [["Disponible", "✅"]],
  2: [["Comida", "🍽️"], ["Cena", "🌙"]],
  3: [["Desayuno", "☕"], ["Comida", "🍽️"], ["Cena", "🌙"]],
  4: [["Mañana", "🌅"], ["Mediodía", "☀️"], ["Tarde", "🌇"], ["Noche", "🌙"]],
};

interface Opt { name: string; icon: string; touched: boolean } // touched = icono elegido a mano

const applyPresets = (opts: Opt[], count: number) =>
  opts.map((o, i) => (!o.touched && PRESETS[count][i] ? { ...o, icon: PRESETS[count][i][1] } : o));

const MAX_HOURS = 48; // horas sueltas, como mucho por día (son todas las medias horas del día)

const toggled = (set: Set<string>, k: string) => {
  const next = new Set(set);
  next.has(k) ? next.delete(k) : next.add(k);
  return next;
};

// Botón 😊 que acompaña a un campo de texto: inserta emojis en la posición del cursor.
function EmojiButton({ field, setValue }: {
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
      }}>😊</button>
  );
}

// Desplegable de horas de un día: varias elegibles a la vez, sin cerrarse al marcar una.
function HourDropdown({ day, options, chosen, onToggle }: {
  day: string; options: string[]; chosen: string[]; onToggle: (h: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const label = chosen.length ? plural(chosen.length, ["hora elegida", "horas elegidas"]) : "Elegir horas…";

  return (
    <div className="hour-dd" ref={wrap}>
      <button type="button" ref={btn} className="input hour-dd-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`Horas del ${D.fmtDayShort(day)}`} onClick={() => setOpen(o => !o)}>
        <span className="hour-dd-label">{label}</span>
        <span className="hour-dd-arrow" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="hour-dd-menu" role="listbox" aria-multiselectable="true" aria-label={`Horas del ${D.fmtDayShort(day)}`}>
          {options.map(h => {
            const on = chosen.includes(h);
            return (
              <button key={h} type="button" role="option" aria-selected={on} className={cls("hour-dd-opt", on && "on")}
                onClick={() => onToggle(h)}>
                <span className="hour-dd-check" aria-hidden="true">{on ? "✓" : ""}</span>{h}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Create() {
  const { store, user, library, lastGroup, setLastGroup } = useSession();
  const { toast, openEmoji, closeEmoji } = useUi();
  const now = useRef(new Date()).current;
  const groups = library.data?.groups || null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PollType>("days");
  const [year, setYear] = useState(now.getFullYear());
  const [months, setMonths] = useState<Set<string>>(() => new Set());
  const [days, setDays] = useState<Set<string>>(() => new Set());   // para "days" y "hours"
  const [weeks, setWeeks] = useState<Set<string>>(() => new Set()); // lunes de cada semana
  const [count, setCount] = useState(1);
  const [opts, setOpts] = useState<Opt[]>(() =>
    applyPresets(Array.from({ length: MAX_OPTIONS }, () => ({ name: "", icon: "", touched: false })), 1));
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("21:00");
  const [step, setStep] = useState(60);
  const [hourMode, setHourMode] = useState<"range" | "list">("range");
  const [hoursByDay, setHoursByDay] = useState<Record<string, string[]>>({}); // horas sueltas, por día
  const [groupId, setGroupId] = useState(lastGroup || "");
  const [newGroup, setNewGroup] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [deadlineDay, setDeadlineDay] = useState("");   // "YYYY-MM-DD"; vacío = sin plazo
  const [deadlineTime, setDeadlineTime] = useState(""); // vacío = hasta el final de ese día
  const [access, setAccess] = useState<"open" | "approval" | "emails">("open");
  const [emailsText, setEmailsText] = useState("");
  const [maxText, setMaxText] = useState(""); // vacío = el tope general (MAX_PEOPLE)
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const last = useRef<string | null>(null); // última casilla pulsada (para rangos con Mayús)

  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const newGroupRef = useRef<HTMLInputElement>(null);
  const optRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { titleRef.current?.focus(); }, []);
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

  // Al quitar un mes, se quitan los días/semanas que ya no se ven.
  function toggleMonth(k: string) {
    const nextMonths = toggled(months, k);
    const ok = new Set<string>();
    nextMonths.forEach(mk => { const { y, m } = D.parseMonth(mk); D.monthWeeks(y, m).forEach(w => ok.add(w.key)); });
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
    return next;
  }

  function quick(kind: string) {
    if (type === "weeks") {
      setWeeks(new Set(kind === "all" ? selectableWeeks() : []));
    } else {
      const weekend = (k: string) => D.dowMon(D.parseDay(k)) >= 5;
      const pick: Record<string, (k: string) => boolean> = { all: () => true, none: () => false, weekdays: k => !weekend(k), weekends: weekend };
      setDays(new Set(selectableDays().filter(pick[kind])));
    }
    last.current = null;
  }

  function changeCount(n: number) {
    setCount(n);
    closeEmoji();
    setOpts(o => applyPresets(o, n));
  }

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOpts(o => o.map((x, j) => (j === i ? { ...x, ...patch, touched: x.touched || "icon" in patch } : x)));

  // ---------- Validación y envío ----------

  function validate(): [string, string] | null {
    if (!title.trim()) return ["Ponle un nombre a la votación.", "#f-title"];
    if (validGroupId === "__new" && !newGroup.trim()) return ["Escribe el nombre del grupo nuevo (o elige otro).", "#f-newgroup"];
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

  async function submit() {
    if (busy) return;
    const err = validate();
    if (err) {
      setStatus(err[0]);
      const el = root.current?.querySelector<HTMLElement>(err[1]);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el.matches("input, textarea")) el.focus({ preventScroll: true });
      }
      return;
    }
    setStatus("");
    const createdAt = Date.now();
    const poll: PollData = {
      v: 1,
      title: title.trim(),
      description: description.trim(),
      type,
      months: sortedMonths,
      slots: type === "months" ? sortedMonths : type === "weeks" ? [...weeks].sort() : [...days].sort(),
      hours: type === "hours" && !isList ? hourSlots : [],
      hourStep: type === "hours" && !isList ? step : 0,
      ...(type === "hours" && isList
        ? { hourList: true, hoursByDay: Object.fromEntries(sortedHourDays.map(d => [d, hoursByDay[d] || []])) }
        : {}),
      options: type === "days"
        ? opts.slice(0, count).map((o, i) => ({ id: `o${i + 1}`, name: o.name.trim(), icon: o.icon }))
        : [],
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

  const visible = {
    name: true,
    type: true,
    months: true,
    slots: type !== "months",
    opts: type === "days",
    hours: type === "hours",
    privacy: true,
    deadline: true,
    access: true,
  };
  const numbers: Partial<Record<keyof typeof visible, number>> = {};
  let n = 0;
  for (const [k, v] of Object.entries(visible)) if (v) numbers[k as keyof typeof visible] = ++n;

  const cur = D.currentMonthKey();
  const minYear = now.getFullYear();
  const isWeeks = type === "weeks";

  const typeCard = (on: boolean, icon: string, name: string, desc: string, onClick: () => void, key: string) => (
    <button key={key} type="button" className={`type-card ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>
      <span className="type-icon">{icon}</span>
      <span className="type-name">{name}</span>
      <span className="type-desc">{desc}</span>
    </button>
  );

  const summaryParts = [`${TYPE[type].icon} ${TYPE[type].name}`];
  if (type === "months") summaryParts.push(plural(months.size, ["mes", "meses"]));
  else if (type === "weeks") summaryParts.push(plural(weeks.size, ["semana", "semanas"]));
  else summaryParts.push(plural(days.size, ["día", "días"]));
  if (type === "days") summaryParts.push(plural(count, ["opción", "opciones"]) + " por día");
  if (type === "hours") summaryParts.push(isList
    ? plural(listHoursCount, ["hora", "horas"]) + " en total"
    : plural(hourSlots.length, ["franja", "franjas"]) + " por día");
  summaryParts.push(anonymous ? "anónima" : "votos visibles");
  if (deadlineTs) summaryParts.push(`hasta el ${fmtDeadline(deadlineTs)}`);
  if (access === "emails") summaryParts.push(`solo ${plural(parsed.emails.length, ["correo", "correos"])}`);
  if (access === "approval") summaryParts.push("con aprobación");
  summaryParts.push(`máx. ${maxPeople ?? MAX_PEOPLE} personas`);

  const starts: string[] = [], ends: string[] = [];
  for (let t = 0; t < 1440; t += 30) starts.push(D.hhmm(t));
  for (let t = 30; t <= 1440; t += 30) ends.push(D.hhmm(t));

  const shownOpts = opts.slice(0, count);

  return (
    <>
      <div className="page-head">
        <a className="back" href="#/">← Volver</a>
        <h1>Nueva votación</h1>
      </div>
      <div className="create" ref={root}>
        <section className="step" id="sec-name">
          <h2><span className="num">{numbers.name}</span>Nombre</h2>
          <div className="emoji-field">
            <input ref={titleRef} id="f-title" className="input big" maxLength={120} placeholder="Ej.: Cena de Navidad 2026 🎄"
              autoComplete="off" value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} />
            <EmojiButton field={() => titleRef.current} setValue={setTitle} />
          </div>
          <div className="emoji-field area">
            <textarea ref={descRef} id="f-desc" className="input" maxLength={300} rows={2} placeholder="Descripción (opcional)"
              value={description} onChange={e => setDescription(e.target.value)} />
            <EmojiButton field={() => descRef.current} setValue={setDescription} />
          </div>
          <div className="group-pick">
            <label htmlFor="f-group">Guardar en el grupo</label>
            <GroupSelect id="f-group" className="input" groups={groups} value={validGroupId}
              extra={[{ value: "__new", label: "＋ Crear grupo nuevo…" }]}
              onChange={v => {
                setGroupId(v);
                if (v === "__new") requestAnimationFrame(() => newGroupRef.current?.focus());
              }} />
            <input ref={newGroupRef} id="f-newgroup" className="input" maxLength={40} placeholder="Nombre del nuevo grupo" autoComplete="off"
              hidden={validGroupId !== "__new"} value={newGroup} onChange={e => setNewGroup(e.target.value)} />
          </div>
        </section>

        <section className="step" id="sec-type">
          <h2><span className="num">{numbers.type}</span>¿Qué se vota?</h2>
          <div className="types" id="s-type">
            {TYPES.map(t => typeCard(type === t.id, t.icon, t.name, t.desc, () => {
              if (type === t.id) return;
              setType(t.id);
              last.current = null;
            }, t.id))}
          </div>
        </section>

        <section className="step" id="sec-months">
          <h2><span className="num">{numbers.months}</span>Meses</h2>
          <p className="hint" id="h-months">
            {type === "months"
              ? "Elige los meses que se podrán votar. Cambia de año con las flechas."
              : `Elige el mes o los meses en los que estarán ${isWeeks ? "las semanas" : "los días"} de la votación. Cambia de año con las flechas.`}
          </p>
          <div id="s-months">
            <div className="year-nav">
              <button type="button" className="icon-btn" disabled={year <= minYear} aria-label="Año anterior" onClick={() => setYear(y => y - 1)}>‹</button>
              <strong>{year}</strong>
              <button type="button" className="icon-btn" disabled={year >= minYear + 3} aria-label="Año siguiente" onClick={() => setYear(y => y + 1)}>›</button>
            </div>
            <div className="month-chips">
              {D.MNAMES.map((name, m) => {
                const k = D.monthKey(year, m);
                return (
                  <button key={k} type="button" className={`chip month-chip ${months.has(k) ? "on" : ""}`} aria-pressed={months.has(k)}
                    disabled={k < cur} onClick={() => toggleMonth(k)}>{D.cap(name)}</button>
                );
              })}
            </div>
            <div className="selected-months">
              {sortedMonths.length
                ? sortedMonths.map(k => (
                  <span key={k} className="tag">{D.cap(D.fmtMonth(k))}
                    <button type="button" aria-label={`Quitar ${D.fmtMonth(k)}`} onClick={() => toggleMonth(k)}>×</button>
                  </span>
                ))
                : <span className="muted">Ningún mes seleccionado.</span>}
            </div>
          </div>
        </section>

        <section className="step" id="sec-slots" hidden={!visible.slots}>
          <h2><span className="num">{numbers.slots}</span><span id="t-slots">{isWeeks ? "Semanas" : "Días"}</span></h2>
          <p className="hint" id="h-slots">
            {!sortedMonths.length ? "" : isWeeks
              ? "Pulsa en las semanas que se podrán votar. Una semana que cae entre dos meses es la misma en los dos calendarios."
              : `Pulsa en los días que se podrán votar${type === "hours" ? " (en cada uno se votarán las horas)" : ""}. En ordenador, mantén Mayús para marcar un rango.`}
          </p>
          <div id="s-slots">
            {visible.slots && (!sortedMonths.length
              ? <div className="empty-box">Primero elige al menos un mes.</div>
              : <>
                <div className="quick">
                  {isWeeks ? <>
                    <button type="button" className="chip" onClick={() => quick("all")}>Todas</button>
                    <button type="button" className="chip" onClick={() => quick("none")}>Ninguna</button>
                  </> : <>
                    <button type="button" className="chip" onClick={() => quick("all")}>Todos</button>
                    <button type="button" className="chip" onClick={() => quick("none")}>Ninguno</button>
                    <button type="button" className="chip" onClick={() => quick("weekdays")}>Lunes a viernes</button>
                    <button type="button" className="chip" onClick={() => quick("weekends")}>Fines de semana</button>
                  </>}
                  <span className="count-note">
                    {plural(isWeeks ? weeks.size : days.size, isWeeks ? ["semana seleccionada", "semanas seleccionadas"] : ["día seleccionado", "días seleccionados"])}
                  </span>
                </div>
                <div className="pick-months">
                  {sortedMonths.map(mk => {
                    const { y, m } = D.parseMonth(mk);
                    if (isWeeks) {
                      return (
                        <div key={mk} className="pick-month">
                          <h3>{D.fmtMonth(mk)}</h3>
                          <div className="pweek-head"><span></span>{D.DOW.map(x => <span key={x}>{x}</span>)}</div>
                          <div className="pweeks">
                            {D.monthWeeks(y, m).map(w => (
                              <button key={w.key} type="button" className={`pweek ${weeks.has(w.key) ? "on" : ""}`} aria-pressed={weeks.has(w.key)}
                                disabled={D.weekEndKey(w.key) < today}
                                onClick={(e: MouseEvent) => setWeeks(toggleRange(weeks, w.key, selectableWeeks(), e.shiftKey))}>
                                <span className="wnum">S{w.num}</span>
                                {w.days.map(d => <span key={d.key} className={`wd ${d.inMonth ? "" : "out"}`}>{d.d}</span>)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    const cells = D.DOW.map(x => <div key={`h${x}`} className="dow">{x}</div>);
                    for (let i = 0, first = D.dowMon(new Date(y, m, 1)); i < first; i++) cells.push(<div key={`e${i}`}></div>);
                    for (let d = 1, nd = D.daysInMonth(y, m); d <= nd; d++) {
                      const k = D.dayKey(y, m, d);
                      const we = D.dowMon(new Date(y, m, d)) >= 5;
                      cells.push(
                        <button key={k} type="button" className={cls("pday", days.has(k) && "on", we && "we")} aria-pressed={days.has(k)}
                          disabled={k < today} onClick={(e: MouseEvent) => setDays(toggleRange(days, k, selectableDays(), e.shiftKey))}>{d}</button>,
                      );
                    }
                    return <div key={mk} className="pick-month"><h3>{D.fmtMonth(mk)}</h3><div className="pgrid">{cells}</div></div>;
                  })}
                </div>
              </>)}
          </div>
        </section>

        <section className="step" id="sec-opts" hidden={!visible.opts}>
          <h2><span className="num">{numbers.opts}</span>Opciones de cada día</h2>
          <p className="hint">Cada día puede tener hasta 4 opciones (por ejemplo, comida y cena). El icono se verá en el calendario y el nombre en la leyenda.</p>
          <div id="s-opts">
            {visible.opts && <>
              <div className="seg" role="group" aria-label="Opciones por día">
                {[1, 2, 3, 4].map(k => (
                  <button key={k} type="button" className={count === k ? "on" : ""} aria-pressed={count === k} onClick={() => changeCount(k)}>{k}</button>
                ))}
                <span className="seg-label">{count === 1 ? "opción" : "opciones"} por día</span>
              </div>
              <div className="opt-layout">
                <div className="opt-rows">
                  {shownOpts.map((o, i) => (
                    <div key={i} className="opt-row">
                      <span className={`opt-swatch sw c${i}`}></span>
                      <button type="button" className="icon-pick" aria-label={`Elegir icono de la opción ${i + 1}`} aria-expanded="false" title="Elegir icono"
                        onClick={e => {
                          const anchor = e.currentTarget;
                          openEmoji({ anchor, onPick: emoji => { setOpt(i, { icon: emoji }); anchor.focus(); } });
                        }}>{o.icon || "＋"}</button>
                      <div className="emoji-field">
                        <input ref={el => { optRefs.current[i] = el; }} className="input" id={`f-opt-${i}`} data-opt-name={i} maxLength={30}
                          value={o.name} placeholder={`Ej.: ${PRESETS[count][i][0]}`} aria-label={`Nombre de la opción ${i + 1}`} autoComplete="off"
                          onChange={e => setOpt(i, { name: e.target.value })} />
                        <EmojiButton field={() => optRefs.current[i]} setValue={v => setOpt(i, { name: v })} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="opt-preview">
                  <div className="preview-label">Vista previa</div>
                  <div className={`cell n${count} preview`}>
                    <div className="day">22</div>
                    {shownOpts.map((o, i) => (
                      <span key={i} className={`opt c${i} ${i % 2 === 0 ? "on" : ""}`}>
                        <span className="label">{o.icon}</span><span className="count">{[3, 1, 2, 0][i]}</span>
                      </span>
                    ))}
                  </div>
                  <div className="legend mini">
                    {shownOpts.map((o, i) => (
                      <span key={i} className="lg"><span className={`sw c${i}`}></span>{o.icon} {o.name || <em className="muted">{PRESETS[count][i][0]}</em>}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>}
          </div>
        </section>

        <section className="step" id="sec-hours" hidden={!visible.hours}>
          <h2><span className="num">{numbers.hours}</span>Horas</h2>
          <div className="hour-mode" role="group" aria-label="Cómo se eligen las horas">
            <button type="button" className={cls("chip", !isList && "on")} aria-pressed={!isList} onClick={() => setHourMode("range")}>Franjas periódicas</button>
            <button type="button" className={cls("chip", isList && "on")} aria-pressed={isList} onClick={() => setHourMode("list")}>Horas sueltas</button>
          </div>
          <p className="hint">
            {isList
              ? "Elige, para cada día, las horas concretas que se podrán votar. Pueden ser distintas en cada día (por ejemplo, 18:00 y 18:30 uno y 19:00 otro)."
              : "Las mismas franjas se repetirán en cada uno de los días elegidos."}
          </p>
          <div id="s-hours">
            {visible.hours && isList && <>
              {!sortedHourDays.length
                ? <div className="empty-box">Primero elige los días en el paso «{numbers.slots}. Días».</div>
                : <div className="hour-day-rows">
                  {sortedHourDays.map(d => {
                    const chosen = hoursByDay[d] || [];
                    return (
                      <div key={d} className="hour-day-row">
                        <div className="hour-day-head">
                          <span className="hour-day-label">{D.cap(D.fmtDayShort(d))}</span>
                          <HourDropdown day={d} options={starts} chosen={chosen}
                            onToggle={h => (chosen.includes(h) ? removeDayHour(d, h) : addDayHour(d, h))} />
                        </div>
                        <div className="hour-chips">
                          {chosen.length
                            ? chosen.map(h => (
                              <span key={h} className="tag">{h}
                                <button type="button" aria-label={`Quitar las ${h} del ${D.fmtDayShort(d)}`} onClick={() => removeDayHour(d, h)}>×</button>
                              </span>
                            ))
                            : <span className="muted">Todavía no hay ninguna hora.</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>}
              <p className="hint hint-after">{plural(listHoursCount, ["hora", "horas"])} en total.</p>
            </>}
            {visible.hours && !isList && <>
              <div className="hours-form">
                <label>Desde<select className="input" value={from} onChange={e => setFrom(e.target.value)}>
                  {starts.map(v => <option key={v} value={v}>{v}</option>)}
                </select></label>
                <label>Hasta<select className="input" value={to} onChange={e => setTo(e.target.value)}>
                  {ends.map(v => <option key={v} value={v}>{v}</option>)}
                </select></label>
                <label>Cada<select className="input" value={step} onChange={e => setStep(Number(e.target.value))}>
                  {([[30, "30 minutos"], [60, "1 hora"], [120, "2 horas"]] as const).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              </div>
              <div className="hour-chips">
                {hourSlots.length
                  ? hourSlots.map(h => <span key={h} className="chip static">{h}</span>)
                  : <span className="status">Con ese rango no cabe ninguna franja.</span>}
              </div>
              <p className="hint hint-after">{plural(hourSlots.length, ["franja", "franjas"])} por día.</p>
            </>}
          </div>
        </section>

        <section className="step" id="sec-privacy">
          <h2><span className="num">{numbers.privacy}</span>¿Quién ve los votos?</h2>
          <div className="privacy" id="s-privacy">
            {typeCard(!anonymous, "👁️", "Votos visibles", "Cada participante puede ver qué ha votado cada persona.", () => setAnonymous(false), "vis")}
            {typeCard(anonymous, "🕶️", "Anónima", "Solo se ven los totales. Más adelante no se podrá hacer visible.", () => setAnonymous(true), "anon")}
          </div>
        </section>

        <section className="step" id="sec-deadline">
          <h2><span className="num">{numbers.deadline}</span>¿Hasta cuándo se vota?</h2>
          <p className="hint">
            Opcional. Al llegar el plazo, la votación deja de admitir votos y tú decides si la cierras o quitas el
            plazo. Si lo dejas vacío, sigue abierta hasta que la cierres.
          </p>
          <div className="deadline-form" id="s-deadline">
            <label htmlFor="f-deadline">Último día
              <input id="f-deadline" className="input" type="date" min={today} value={deadlineDay}
                onChange={e => setDeadlineDay(e.target.value)} />
            </label>
            <label htmlFor="f-deadline-time">Hora <span className="muted">(opcional)</span>
              <input id="f-deadline-time" className="input" type="time" step={300} value={deadlineTime}
                disabled={!deadlineDay} onChange={e => setDeadlineTime(e.target.value)} />
            </label>
            {deadlineDay && (
              <button type="button" className="link-btn" onClick={() => { setDeadlineDay(""); setDeadlineTime(""); }}>
                Quitar el plazo
              </button>
            )}
          </div>
          {!!deadlineTs && <p className="hint hint-after">Se podrá votar hasta el {fmtDeadline(deadlineTs)}.</p>}
        </section>

        <section className="step" id="sec-access">
          <h2><span className="num">{numbers.access}</span>¿Quién puede unirse?</h2>
          <div className="access-pick" id="s-access">
            {typeCard(access === "open", "🔗", "Cualquiera con el enlace", "Quien abra el enlace entra y vota.", () => setAccess("open"), "open")}
            {typeCard(access === "approval", "✋", "Con tu aprobación", "Quien entre verá la votación, pero no podrá votar hasta que le aceptes.", () => setAccess("approval"), "approval")}
            {typeCard(access === "emails", "✉️", "Solo estos correos", "Privada: solo entran las cuentas de Google que indiques.", () => setAccess("emails"), "emails")}
          </div>
          {access === "emails" && (
            <div className="access-emails">
              <label className="field-label" htmlFor="f-emails">Correos que pueden entrar</label>
              <textarea id="f-emails" className="input" rows={3} value={emailsText} onChange={e => setEmailsText(e.target.value)}
                placeholder="ana@gmail.com, carlos@gmail.com…" autoComplete="off" spellCheck={false} />
              <p className="hint">
                Sepáralos con comas, espacios o saltos de línea. Tú siempre puedes entrar.
                {parsed.emails.length > 0 && <> <strong>{plural(parsed.emails.length, ["correo válido", "correos válidos"])}</strong>.</>}
                {parsed.invalid.length > 0 && <span className="warn"> No son correos: {parsed.invalid.slice(0, 3).join(", ")}{parsed.invalid.length > 3 ? "…" : ""}.</span>}
                {store.mode === "demo" && <> En el modo demo, el correo de cada persona es su nombre@demo.test (por ejemplo, ana@demo.test).</>}
              </p>
            </div>
          )}
          <div className="access-max">
            <label className="field-label" htmlFor="f-max">Máximo de personas <span className="muted">(contándote a ti)</span></label>
            <input id="f-max" className="input small" type="number" inputMode="numeric" min={2} max={MAX_PEOPLE}
              value={maxText} onChange={e => setMaxText(e.target.value)} placeholder={String(MAX_PEOPLE)} />
            <p className="hint">Si lo dejas vacío, pueden unirse hasta {MAX_PEOPLE} personas, el límite de cualquier votación.</p>
          </div>
        </section>

        <div className="create-bar">
          <div className="create-summary" id="c-summary">{summaryParts.join(" · ")}</div>
          <button type="button" className="btn primary big" id="c-submit" disabled={busy} onClick={submit}>{busy ? "Creando…" : "Crear votación"}</button>
          <div className="status" id="c-status" role="alert">{status}</div>
        </div>
      </div>
    </>
  );
}
