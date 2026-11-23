// Pantalla "Mis votaciones": la colección del usuario organizada en grupos, y la zona de archivadas.
// En el móvil cada votación se desliza: → archivar (o desarchivar), ← salir de ella (con confirmación).
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TYPE, pollMeta, isAdmin } from "../lib/model";
import type { LibraryEntry, Poll } from "../lib/types";
import { errMsg, pollUrl, sortedGroups } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { GroupSelect } from "../components/GroupSelect";
import { SwipeRow } from "../components/SwipeRow";
import { Icon } from "../components/Icon";
import { PremiumTag } from "../components/Premium";
import { useListActions } from "../state/listActions";
import { useDuplicate } from "../state/duplicate";
import { PollListSkeleton } from "../components/Loading";

type Entry = LibraryEntry & { id: string };
type Form = { mode: "new" | "rename"; gid?: string; value: string } | null;

export function Home() {
  const { store, user, library, pollCache, homeFilter, setHomeFilter, setLastGroup } = useSession();
  const { toast, share } = useUi();
  const { setArchived, leave, moveTo, deleteGroup } = useListActions();
  const duplicate = useDuplicate();
  const lib = library.data;
  // Datos de cada votación (o null si ya no existe). Solo se piden las que no se han leído en esta sesión.
  const [cache, setCache] = useState<Record<string, Poll | null>>(() => Object.fromEntries(pollCache));
  const requested = useRef(new Set<string>(pollCache.keys()));
  const [expanded, setExpanded] = useState<string | null>(null); // votación con el menú ⋯ abierto
  const [form, setForm] = useState<Form>(null);
  const [status, setStatus] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lib) return;
    for (const id of Object.keys(lib.polls)) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      store.getPoll(id)
        .then(p => { pollCache.set(id, p); setCache(c => ({ ...c, [id]: p })); })
        .catch(() => { /* sin datos: se muestra lo guardado en la colección */ });
    }
  }, [lib, store, pollCache]);

  const formMode = form?.mode;
  useEffect(() => { if (formMode) nameRef.current?.focus(); }, [formMode]);

  if (library.error) {
    return <>
      <HomeHead />
      <div id="home-body"><div className="empty-box empty-box--error">{errMsg(library.error)}</div></div>
    </>;
  }
  if (!lib) {
    return <><HomeHead /><div id="home-body"><PollListSkeleton label="Cargando tus votaciones…" /></div></>;
  }

  let filter = homeFilter;
  if (filter !== "all" && filter !== "none" && filter !== "archived" && !lib.groups[filter]) filter = "all";
  const setFilter = (f: string) => {
    setHomeFilter(f);
    setLastGroup(f === "all" || f === "none" || f === "archived" ? "" : f);
  };

  const groups = sortedGroups(lib.groups);
  const entries: Entry[] = Object.entries(lib.polls)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)); // como el menú lateral: las añadidas más recientemente primero
  const all = entries.filter(e => !e.archived);
  const archived = entries.filter(e => e.archived);
  const inGroup = (gid: string | null) => all.filter(e => (gid ? e.groupId === gid : !e.groupId || !lib.groups[e.groupId]));

  const run = async (fn: () => Promise<unknown>) => {
    setStatus("");
    try { await fn(); } catch (err) { setStatus(errMsg(err)); }
  };

  const removeGroup = () => run(async () => { if (await deleteGroup(filter)) setFilter("all"); });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = (form?.value || "").trim();
    if (!form || !name) return;
    const f = form;
    run(async () => {
      if (f.mode === "new") {
        const gid = await store.createGroup(user.uid, name);
        setFilter(gid);
        toast(`Grupo «${name}» creado`);
      } else {
        await store.renameGroup(user.uid, f.gid!, name);
        toast("Grupo renombrado");
      }
      setForm(null);
    });
  };


  const card = (e: Entry) => {
    const p = cache[e.id];
    const gone = p === null;
    const type = TYPE[(p?.type || e.type)!];
    const owner = (p?.ownerUid || null) === user.uid || e.role === "owner";
    const groupName = e.groupId ? lib.groups[e.groupId]?.name : "";
    const meta = [
      p ? pollMeta(p) : type?.name || "",
      owner ? "creada por ti" : `de ${p?.ownerName || e.ownerName || "alguien"}`,
      e.archived && groupName ? `grupo «${groupName}»` : "",
    ].filter(Boolean).join(" · ");
    const open = expanded === e.id;
    const toggleArchive = () => setArchived(e.id, !e.archived);
    return (
      <SwipeRow
        key={e.id}
        right={e.archived
          ? { icon: <Icon name="unarchive" />, label: "Desarchivar", tone: "archive", run: toggleArchive }
          : { icon: <Icon name="archive" />, label: "Archivar", tone: "archive", run: toggleArchive }}
        left={gone
          ? { icon: <Icon name="trash" />, label: "Quitar", tone: "danger", run: () => leave(e.id) }
          : { icon: <Icon name="leave" />, label: "Salir", tone: "danger", run: () => leave(e.id) }}
      >
      <div className={`poll-card ${gone ? "poll-card--gone" : ""}`}>
        <div className="poll-card__row">
          <a className="poll-card__link" href={`#/v/${e.id}`}>
            <span className="poll-card__icon"><Icon name={type?.icon || "vote"} /></span>
            <span className="poll-card__main">
              <span className="poll-card__title">{p?.title || e.title || "Votación"}</span>
              <span className="poll-card__meta">{meta}</span>
            </span>
            <span className="poll-card__badges">
              {gone && <span className="badge badge--gone">Eliminada</span>}
              {p?.closed && <span className="badge">Cerrada</span>}
              {p?.anonymous && <span className="badge badge--anon">Anónima</span>}
              {owner && <span className="badge badge--mine">Tuya</span>}
              {!owner && p && isAdmin(p, user.uid) && <span className="badge badge--mine">Admin</span>}
            </span>
          </a>
          <button className="poll-card__more" aria-expanded={open} aria-label="Más opciones"
            onClick={() => { setStatus(""); setExpanded(open ? null : e.id); }}><Icon name="more" /></button>
        </div>
        {open && (
          <div className="poll-card__actions">
            <label className="poll-card__field">Grupo <GroupSelect className="input input--small poll-card__select" groups={lib.groups} value={e.groupId || ""}
              onChange={v => run(() => moveTo(e.id, v || null))} /></label>
            {!gone && (
              <button className="btn btn--small" onClick={() => share({ url: pollUrl(e.id), title: p?.title || e.title || "Votación" })}><Icon name="link" /> Compartir</button>
            )}
            {p && <button className="btn btn--small" onClick={() => { setExpanded(null); duplicate(p); }}><Icon name="copy" /> Duplicar <PremiumTag decorative /></button>}
            <button className="btn btn--small" onClick={() => { setExpanded(null); toggleArchive(); }}>
              {e.archived ? <><Icon name="unarchive" /> Desarchivar</> : <><Icon name="archive" /> Archivar</>}
            </button>
            <button className="btn btn--small btn--danger" onClick={() => leave(e.id)}>
              {gone ? <><Icon name="trash" /> Quitar de mi lista</> : <><Icon name="leave" /> Salir de la votación</>}
            </button>
          </div>
        )}
      </div>
      </SwipeRow>
    );
  };

  const chip = (f: string, label: ReactNode, n: number) => (
    <button key={f} className={`chip groups__chip ${filter === f ? "chip--on" : ""}`} aria-pressed={filter === f}
      onClick={() => { setStatus(""); setFilter(f); setForm(null); }}>
      {label} <span className="chip__count">{n}</span>
    </button>
  );

  let list;
  if (filter === "archived") {
    list = archived.length
      ? <div className="poll-list">{archived.map(card)}</div>
      : <div className="empty-box">No tienes votaciones archivadas.</div>;
  } else if (!all.length) {
    list = <div className="empty-box">Todavía no tienes votaciones. <a href="#/nueva">Crea la primera</a> o abre el enlace que te hayan pasado.</div>;
  } else if (filter === "all" && groups.length) {
    const sections = groups.map(gr => ({ key: gr.id, title: gr.name, items: inGroup(gr.id) }))
      .concat([{ key: "_none", title: "Sin grupo", items: inGroup(null) }])
      .filter(s => s.items.length);
    list = sections.map(s => (
      <section key={s.key} className="library__section">
        <h2 className="library__title">{s.title} <span className="muted">({s.items.length})</span></h2>
        <div className="poll-list">{s.items.map(card)}</div>
      </section>
    ));
  } else {
    const items = filter === "all" ? all : inGroup(filter === "none" ? null : filter);
    list = items.length
      ? <div className="poll-list">{items.map(card)}</div>
      : <div className="empty-box">No hay votaciones aquí. Muévelas desde el botón ⋯ de cada una, o elige este grupo al crear una nueva.</div>;
  }

  const g = lib.groups[filter];
  return (
    <>
      <HomeHead />
      <div id="home-body">
        {filter === "archived" ? (
          <div className="archived-head">
            <button className="link-btn back-link" onClick={() => { setStatus(""); setFilter("all"); }}>
              <Icon name="back" /> Volver a mis votaciones
            </button>
            <h2 className="archived-head__title"><Icon name="archive" /> Archivadas <span className="muted">({archived.length})</span></h2>
          </div>
        ) : (
        <div className="groups">
          <div className="groups__chips">
            {chip("all", "Todas", all.length)}
            {groups.map(gr => chip(gr.id, gr.name, inGroup(gr.id).length))}
            {groups.length > 0 && chip("none", "Sin grupo", inGroup(null).length)}
            <button className="chip chip--ghost" onClick={() => { setStatus(""); setForm({ mode: "new", value: "" }); }}><Icon name="plus" /> Nuevo grupo</button>
          </div>
          {form && (
            <form className="inline-form" onSubmit={submit}>
              <input ref={nameRef} className="input inline-form__input" maxLength={40} placeholder="Nombre del grupo (ej.: Familia, Trabajo…)"
                autoComplete="off" value={form.value} onChange={e => setForm(f => f && { ...f, value: e.target.value })} />
              <button className="btn btn--primary" type="submit">{form.mode === "new" ? "Crear grupo" : "Guardar"}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </form>
          )}
          {g && !form && (
            <div className="groups__tools">
              <strong>{g.name}</strong>
              <button className="link-btn" onClick={() => { setStatus(""); setForm({ mode: "rename", gid: filter, value: g.name || "" }); }}>Renombrar</button>
              <button className="link-btn link-btn--danger" onClick={removeGroup}>Eliminar grupo</button>
            </div>
          )}
        </div>
        )}
        <div className="status" role="alert">{status}</div>
        {filter === "archived" && archived.length > 0 && (
          <p className="library__archived-note">Las archivadas no aparecen en el panel ni en el menú, pero conservan su grupo. Desarchívalas para recuperarlas.</p>
        )}
        {list}
        {/* Las archivadas no son un grupo: van aparte, al final de la lista. */}
        {filter !== "archived" && archived.length > 0 && (
          <button className="archived-row" onClick={() => { setStatus(""); setFilter("archived"); setForm(null); }}>
            <Icon name="archive" />
            <span className="archived-row__label">Archivadas</span>
            <span className="archived-row__count">{archived.length}</span>
            <Icon name="back" className="archived-row__go" />
          </button>
        )}
        {(filter === "archived" ? archived.length : all.length) > 0 && (
          <p className="library__swipe-hint">
            Desliza una votación → para {filter === "archived" ? "desarchivarla" : "archivarla"} o ← para salir de ella.
          </p>
        )}
      </div>
    </>
  );
}

function HomeHead() {
  return (
    <div className="home__head">
      <div>
        <h1 className="home__title">Mis votaciones</h1>
        <p className="subtitle">Las que has creado y aquellas en las que participas. Organízalas en grupos.</p>
      </div>
      <a className="btn btn--primary btn--big" href="#/nueva"><Icon name="plus" /> Nueva votación</a>
    </div>
  );
}
