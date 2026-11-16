// Pantalla "Nueva votación".
import { useEffect, useRef, useState, type MouseEvent } from "react";
import * as D from "../lib/dates";
import { TYPES, TYPE, MAX_OPTIONS, plural } from "../lib/model";
import type { PollData, PollType } from "../lib/types";
import { cls, errMsg } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { navigate } from "../state/route";
import { GroupSelect } from "../components/GroupSelect";

// Nombres e iconos sugeridos según el número de opciones (solo se aplican a las que no se han tocado).
const PRESETS: Record<number, [string, string][]> = {
  1: [["Disponible", "✅"]],
  2: [["Comida", "🍽️"], ["Cena", "🌙"]],
  3: [["Desayuno", "☕"], ["Comida", "🍽️"], ["Cena", "🌙"]],
  4: [["Mañana", "🌅"], ["Mediodía", "☀️"], ["Tarde", "🌇"], ["Noche", "🌙"]],
};

interface Opt { name: string; icon: string; touched: boolean }

const applyPresets = (opts: Opt[], count: number) =>
  opts.map((o, i) => (!o.touched && PRESETS[count][i] ? { ...o, name: PRESETS[count][i][0], icon: PRESETS[count][i][1] } : o));

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
  const [groupId, setGroupId] = useState(lastGroup || "");
  const [newGroup, setNewGroup] = useState("");
  const [anonymous, setAnonymous] = useState(false);
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

  const setOpt = (i: number, patch: Partial<Opt>) => setOpts(o => o.map((x, j) => (j === i ? { ...x, ...patch, touched: true } : x)));

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
    if (type === "hours" && !hourSlots.length) return ["El rango de horas no contiene ninguna franja.", "#sec-hours"];
    return null;
  }

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
      hours: type === "hours" ? hourSlots : [],
      hourStep: type === "hours" ? step : 0,
      options: type === "days"
        ? opts.slice(0, count).map((o, i) => ({ id: `o${i + 1}`, name: o.name.trim(), icon: o.icon }))
        : [],
      anonymous,
      ownerUid: user.uid,
      ownerName: user.name,
      createdAt,
      closed: false,
    };
    setBusy(true);
    try {
      let gid: string | null = validGroupId || null;
      if (gid === "__new") gid = await store.createGroup(user.uid, newGroup.trim());
      const id = await store.createPoll(poll);
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
  if (type === "hours") summaryParts.push(plural(hourSlots.length, ["franja", "franjas"]) + " por día");
  summaryParts.push(anonymous ? "anónima" : "votos visibles");

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
                          value={o.name} placeholder={`Nombre de la opción ${i + 1}`} autoComplete="off"
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
                      <span key={i} className="lg"><span className={`sw c${i}`}></span>{o.icon} {o.name || <em>sin nombre</em>}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>}
          </div>
        </section>

        <section className="step" id="sec-hours" hidden={!visible.hours}>
          <h2><span className="num">{numbers.hours}</span>Horas</h2>
          <p className="hint">Las mismas franjas se repetirán en cada uno de los días elegidos.</p>
          <div id="s-hours">
            {visible.hours && <>
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

        <div className="create-bar">
          <div className="create-summary" id="c-summary">{summaryParts.join(" · ")}</div>
          <button type="button" className="btn primary big" id="c-submit" disabled={busy} onClick={submit}>{busy ? "Creando…" : "Crear votación"}</button>
          <div className="status" id="c-status" role="alert">{status}</div>
        </div>
      </div>
    </>
  );
}
