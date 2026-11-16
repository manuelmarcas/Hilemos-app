// Pantalla "Mis votaciones": la colección del usuario organizada en grupos.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TYPE, pollMeta } from "../lib/model";
import type { LibraryEntry, Poll } from "../lib/types";
import { errMsg, pollUrl, sortedGroups } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { GroupSelect } from "../components/GroupSelect";

type Entry = LibraryEntry & { id: string };
type Form = { mode: "new" | "rename"; gid?: string; value: string } | null;

export function Home() {
  const { store, user, library, homeFilter, setHomeFilter, setLastGroup } = useSession();
  const { toast, confirm, share } = useUi();
  const lib = library.data;
  // Datos de cada votación (o null si ya no existe). Se vuelven a pedir cada vez que se entra.
  const [cache, setCache] = useState<Record<string, Poll | null>>({});
  const requested = useRef(new Set<string>()); // se piden una sola vez por visita
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
        .then(p => setCache(c => ({ ...c, [id]: p })))
        .catch(() => { /* sin datos: se muestra lo guardado en la colección */ });
    }
  }, [lib, store]);

  const formMode = form?.mode;
  useEffect(() => { if (formMode) nameRef.current?.focus(); }, [formMode]);

  if (library.error) {
    return <>
      <HomeHead />
      <div id="home-body"><div className="empty-box error">{errMsg(library.error)}</div></div>
    </>;
  }
  if (!lib) {
    return <><HomeHead /><div id="home-body"><div className="loading">Cargando…</div></div></>;
  }

  let filter = homeFilter;
  if (filter !== "all" && filter !== "none" && !lib.groups[filter]) filter = "all";
  const setFilter = (f: string) => {
    setHomeFilter(f);
    setLastGroup(f === "all" || f === "none" ? "" : f);
  };

  const groups = sortedGroups(lib.groups);
  const all: Entry[] = Object.entries(lib.polls)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => (b.openedAt || b.addedAt || 0) - (a.openedAt || a.addedAt || 0));
  const inGroup = (gid: string | null) => all.filter(e => (gid ? e.groupId === gid : !e.groupId || !lib.groups[e.groupId]));

  const run = async (fn: () => Promise<unknown>) => {
    setStatus("");
    try { await fn(); } catch (err) { setStatus(errMsg(err)); }
  };

  const remove = (id: string) => run(async () => {
    if (!(await confirm({
      title: "¿Quitar esta votación de tu menú?",
      message: "Tus votos se mantienen y podrás volver a entrar con el enlace.",
      confirmLabel: "Quitar",
      danger: true,
    }))) return;
    await store.removeLibraryEntry(user.uid, id);
    toast("Quitada de tu menú");
  });

  const deleteGroup = () => run(async () => {
    const g = lib.groups[filter];
    if (!g || !(await confirm({
      title: `¿Eliminar el grupo «${g.name}»?`,
      message: "Las votaciones del grupo no se borran: pasan a «Sin grupo».",
      confirmLabel: "Eliminar grupo",
      danger: true,
    }))) return;
    await store.deleteGroup(user.uid, filter);
    setFilter("all");
    toast("Grupo eliminado");
  });

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

  const moveTo = (id: string, groupId: string | null) => run(async () => {
    await store.saveLibraryEntry(user.uid, id, { groupId });
    toast(groupId ? `Movida a «${lib.groups[groupId]?.name}»` : "Movida a «Sin grupo»");
  });

  const card = (e: Entry) => {
    const p = cache[e.id];
    const gone = p === null;
    const type = TYPE[(p?.type || e.type)!];
    const owner = (p?.ownerUid || null) === user.uid || e.role === "owner";
    const meta = [
      p ? pollMeta(p) : type?.name || "",
      owner ? "creada por ti" : `de ${p?.ownerName || e.ownerName || "alguien"}`,
    ].filter(Boolean).join(" · ");
    const open = expanded === e.id;
    return (
      <div key={e.id} className={`poll-card ${gone ? "is-gone" : ""}`}>
        <div className="pc-row">
          <a className="pc-link" href={`#/v/${e.id}`}>
            <span className="pc-icon">{type?.icon || "🗳️"}</span>
            <span className="pc-main">
              <span className="pc-title">{p?.title || e.title || "Votación"}</span>
              <span className="pc-meta">{meta}</span>
            </span>
            <span className="pc-badges">
              {gone && <span className="badge gone">Eliminada</span>}
              {p?.closed && <span className="badge">Cerrada</span>}
              {p?.anonymous && <span className="badge anon">Anónima</span>}
              {owner && <span className="badge mine">Tuya</span>}
            </span>
          </a>
          <button className="pc-more" aria-expanded={open} aria-label="Más opciones"
            onClick={() => { setStatus(""); setExpanded(open ? null : e.id); }}>⋯</button>
        </div>
        {open && (
          <div className="pc-actions">
            <label>Grupo <GroupSelect className="input small" groups={lib.groups} value={e.groupId || ""}
              onChange={v => moveTo(e.id, v || null)} /></label>
            {!gone && (
              <button className="btn small" onClick={() => share({ url: pollUrl(e.id), title: p?.title || e.title || "Votación" })}>🔗 Compartir</button>
            )}
            {(!owner || gone) && <button className="btn small danger" onClick={() => remove(e.id)}>Quitar de mi menú</button>}
          </div>
        )}
      </div>
    );
  };

  const chip = (f: string, label: string, n: number) => (
    <button key={f} className={`chip ${filter === f ? "on" : ""}`} aria-pressed={filter === f}
      onClick={() => { setStatus(""); setFilter(f); setForm(null); }}>
      {label} <span className="n">{n}</span>
    </button>
  );

  let list;
  if (!all.length) {
    list = <div className="empty-box">Todavía no tienes votaciones. <a href="#/nueva">Crea la primera</a> o abre el enlace que te hayan pasado.</div>;
  } else if (filter === "all" && groups.length) {
    const sections = groups.map(gr => ({ key: gr.id, title: gr.name, items: inGroup(gr.id) }))
      .concat([{ key: "_none", title: "Sin grupo", items: inGroup(null) }])
      .filter(s => s.items.length);
    list = sections.map(s => (
      <section key={s.key} className="lib-sec">
        <h2>{s.title} <span className="muted">({s.items.length})</span></h2>
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
        <div className="group-bar">
          <div className="group-chips">
            {chip("all", "Todas", all.length)}
            {groups.map(gr => chip(gr.id, gr.name, inGroup(gr.id).length))}
            {groups.length > 0 && chip("none", "Sin grupo", inGroup(null).length)}
            <button className="chip ghost" onClick={() => { setStatus(""); setForm({ mode: "new", value: "" }); }}>＋ Nuevo grupo</button>
          </div>
          {form && (
            <form className="inline-form" id="group-form" onSubmit={submit}>
              <input ref={nameRef} className="input" id="group-name" maxLength={40} placeholder="Nombre del grupo (ej.: Familia, Trabajo…)"
                autoComplete="off" value={form.value} onChange={e => setForm(f => f && { ...f, value: e.target.value })} />
              <button className="btn primary" type="submit">{form.mode === "new" ? "Crear grupo" : "Guardar"}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </form>
          )}
          {g && !form && (
            <div className="group-tools">
              <strong>{g.name}</strong>
              <button className="link-btn" onClick={() => { setStatus(""); setForm({ mode: "rename", gid: filter, value: g.name || "" }); }}>Renombrar</button>
              <button className="link-btn danger" onClick={deleteGroup}>Eliminar grupo</button>
            </div>
          )}
        </div>
        <div className="status" role="alert">{status}</div>
        {list}
      </div>
    </>
  );
}

function HomeHead() {
  return (
    <div className="home-head">
      <div>
        <h1>Mis votaciones</h1>
        <p className="sub">Las que has creado y aquellas en las que participas. Organízalas en grupos.</p>
      </div>
      <a className="btn primary big" href="#/nueva">＋ Nueva votación</a>
    </div>
  );
}
