// Menú lateral: las votaciones del usuario agrupadas, para saltar de una a otra y organizarlas
// (mover entre grupos con ⋯ o arrastrando, archivar, salir, crear/renombrar/eliminar/plegar grupos).
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { TYPE } from "../lib/model";
import type { LibraryEntry } from "../lib/types";
import { cls, errMsg, sortedGroups } from "../lib/util";
import { useSession } from "../state/session";
import { useUi } from "../state/ui";
import { useHashPath } from "../state/route";
import { useListActions } from "../state/listActions";
import { Icon } from "./Icon";

const CKEY = "votaciones-menu-plegados";
const loadCollapsed = () => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(CKEY) || "[]")); } catch { return new Set<string>(); }
};
const saveCollapsed = (set: Set<string>) => {
  try { localStorage.setItem(CKEY, JSON.stringify([...set])); } catch { /* nada */ }
};

type Item = LibraryEntry & { id: string };
type Menu = { type: "poll" | "group"; id: string } | null;
type Form = { mode: "new" | "rename"; gid?: string; moveId?: string; value: string } | null;

export function Sidebar({ activeId, onNavigate }: { activeId: string | null; onNavigate: () => void }) {
  const { store, user, library, setHomeFilter } = useSession();
  const { toast } = useUi();
  const { setArchived, leave, moveTo, deleteGroup } = useListActions();
  const path = useHashPath();
  const lib = library.data;
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<Menu>(null);
  const [form, setForm] = useState<Form>(null);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [dragging, setDragging] = useState(false);
  const [dropOver, setDropOver] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const gnameRef = useRef<HTMLInputElement>(null);

  // Al cambiar de pantalla se cierran los menús.
  useEffect(() => { setMenu(null); }, [path]);
  const formKey = form ? `${form.mode}:${form.gid || ""}:${form.moveId || ""}` : "";
  useEffect(() => { if (formKey) gnameRef.current?.focus(); }, [formKey]);

  const validGroup = (gid: string | null | undefined) => (gid && lib?.groups[gid] ? gid : "");

  // Mover a otro grupo (no hace nada si ya está en ese).
  async function move(id: string, gid: string, groupName?: string) {
    if (!lib || validGroup(lib.polls[id]?.groupId) === (gid || "")) return;
    await moveTo(id, gid, groupName);
  }

  const run = async (fn: () => Promise<unknown> | void) => {
    try { await fn(); } catch (err) { toast(errMsg(err)); }
  };

  const toggleCollapse = (gid: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(gid) ? next.delete(gid) : next.add(gid);
      saveCollapsed(next);
      return next;
    });
  };

  const archivePoll = (id: string) => { setMenu(null); setArchived(id, true); };
  const leavePoll = async (id: string) => { if (await leave(id)) setMenu(null); };

  const removeGroup = (gid: string) => run(async () => { if (await deleteGroup(gid)) setMenu(null); });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = (form?.value || "").trim();
    if (!form || !name) return;
    const f = form;
    run(async () => {
      if (f.mode === "new") {
        const gid = await store.createGroup(user.uid, name);
        if (f.moveId) await move(f.moveId, gid, name);
        // Los grupos vacíos no salen en el menú: se dice dónde encontrarlo.
        else toast(`Grupo «${name}» creado. Aparecerá aquí cuando le muevas alguna votación (con ⋯ o arrastrándola).`);
      } else {
        await store.renameGroup(user.uid, f.gid!, name);
        toast("Grupo renombrado");
      }
      setForm(null);
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !(form || menu)) return;
    e.stopPropagation(); // que no cierre también el cajón
    setForm(null);
    setMenu(null);
  };

  // ---------- Arrastrar una votación a otro grupo (ordenador) ----------
  const onDragStart = (e: DragEvent, id: string) => {
    dragId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDragging(true);
  };
  const endDrag = () => { dragId.current = null; setDragging(false); setDropOver(null); };
  const onDragOver = (e: DragEvent, gid: string) => {
    if (!dragId.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropOver(gid);
  };
  const onDragLeave = (e: DragEvent, gid: string) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropOver(d => (d === gid ? null : d));
  };
  const onDrop = (e: DragEvent, gid: string) => {
    const id = dragId.current;
    if (!id) return;
    e.preventDefault();
    endDrag();
    run(() => move(id, gid));
  };

  const formHTML = () => form && (
    <form className="sb-form" id="sb-form" onSubmit={submit}>
      <input ref={gnameRef} className="input" id="sb-gname" maxLength={40} placeholder="Nombre del grupo" autoComplete="off"
        value={form.value} onChange={e => setForm(f => f && { ...f, value: e.target.value })} />
      <div className="sb-form-btns">
        <button className="btn small primary" type="submit">{form.mode === "rename" ? "Guardar" : "Crear grupo"}</button>
        <button className="btn small" type="button" onClick={() => setForm(null)}>Cancelar</button>
      </div>
    </form>
  );

  let body;
  let total = 0;
  let archivedCount = 0;
  if (library.error) {
    body = <div className="sb-empty error">{errMsg(library.error)}</div>;
  } else if (!lib) {
    body = <div className="sb-empty">Cargando…</div>;
  } else {
    const groups = sortedGroups(lib.groups);
    // Orden estable (por fecha en que se añadió) para que el menú no salte al ir abriendo votaciones.
    // Las archivadas no se muestran aquí (tienen su zona en "Mis votaciones").
    const items: Item[] = Object.entries(lib.polls)
      .map(([id, e]) => ({ id, ...e }))
      .filter(e => !e.archived)
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    archivedCount = Object.keys(lib.polls).length - items.length;
    total = items.length;
    const q = query.trim().toLowerCase();
    const searching = !!q;
    const hasGroups = groups.length > 0;
    const secs = groups.map(g => ({ gid: g.id, name: g.name, items: items.filter(e => e.groupId === g.id) }));
    secs.push({ gid: "", name: hasGroups ? "Sin grupo" : "Mis votaciones", items: items.filter(e => !validGroup(e.groupId)) });

    const pollMenu = (e: Item) => {
      const cur = validGroup(e.groupId);
      const targets: [string, string][] = [...groups.map(g => [g.id, g.name] as [string, string]), ["", "Sin grupo"]];
      return (
        <div className="sb-menu">
          <div className="sb-menu-label">Mover a</div>
          {targets.map(([gid, name]) => (
            <button key={gid || "_none"} className="sb-menu-item" disabled={gid === cur}
              onClick={() => { setMenu(null); run(() => move(e.id, gid)); }}>
              {gid === cur && <><Icon name="check" /> </>}{name}
            </button>
          ))}
          <button className="sb-menu-item" onClick={() => { setMenu(null); setForm({ mode: "new", moveId: e.id, value: "" }); }}><Icon name="plus" /> Grupo nuevo…</button>
          <div className="sb-menu-sep" />
          <button className="sb-menu-item" onClick={() => archivePoll(e.id)}><Icon name="archive" /> Archivar</button>
          <button className="sb-menu-item danger" onClick={() => leavePoll(e.id)}><Icon name="leave" /> Salir de la votación</button>
        </div>
      );
    };

    const sections = secs.map(s => {
      const shown = searching ? s.items.filter(e => (e.title || "").toLowerCase().includes(q)) : s.items;
      const isGroup = !!s.gid;
      if (searching && !shown.length) return null;
      if (!isGroup && !s.items.length && (!hasGroups || !total)) return null;
      // El menú sirve para moverse entre votaciones: un grupo sin ninguna (sin contar las archivadas), ni «Sin grupo» vacío, solo estorba.
      // Se muestra mientras se arrastra (para poder soltar en él) y al renombrarlo. Sigue estando en «Mover a».
      if (!dragging && !s.items.length && !(form?.mode === "rename" && form.gid === s.gid)) return null;
      const open = searching || !collapsed.has(s.gid);
      const gmenuOpen = menu?.type === "group" && menu.id === s.gid;
      const renaming = form?.mode === "rename" && form.gid === s.gid;
      const hint = isGroup ? "Vacío. Arrastra aquí votaciones o usa ⋯ para moverlas." : "Arrastra aquí para sacarlas de su grupo.";
      return (
        <section key={s.gid || "_none"} className={cls("sb-group", dropOver === s.gid && "drop-over")} data-drop={s.gid}
          onDragOver={e => onDragOver(e, s.gid)} onDragLeave={e => onDragLeave(e, s.gid)} onDrop={e => onDrop(e, s.gid)}>
          <div className="sb-ghead">
            <button className="sb-gtoggle" aria-expanded={open} onClick={() => toggleCollapse(s.gid)}>
              <span className="sb-caret" aria-hidden="true">{open ? "▾" : "▸"}</span>
              <span className="sb-gname">{s.name}</span>
              <span className="sb-count">{s.items.length}</span>
            </button>
            {isGroup && (
              <button className="sb-more" aria-label={`Opciones del grupo ${s.name}`} aria-expanded={gmenuOpen}
                onClick={() => { setMenu(gmenuOpen ? null : { type: "group", id: s.gid }); setForm(null); }}><Icon name="more" /></button>
            )}
          </div>
          {gmenuOpen && (
            <div className="sb-menu">
              <button className="sb-menu-item" onClick={() => { setMenu(null); setForm({ mode: "rename", gid: s.gid, value: lib.groups[s.gid]?.name || "" }); }}>Renombrar</button>
              <button className="sb-menu-item danger" onClick={() => removeGroup(s.gid)}>Eliminar grupo</button>
            </div>
          )}
          {renaming && formHTML()}
          {open && (
            <ul className="sb-list">
              {shown.length ? shown.map(e => {
                const isActive = e.id === activeId;
                const pOpen = menu?.type === "poll" && menu.id === e.id;
                return (
                  <li key={e.id} className={cls("sb-li", isActive && "active")}>
                    <div className="sb-row">
                      <a className="sb-item" href={`#/v/${e.id}`} draggable data-poll={e.id} aria-current={isActive ? "page" : undefined}
                        onClick={() => { setMenu(null); setForm(null); }}
                        onDragStart={ev => onDragStart(ev, e.id)} onDragEnd={endDrag}>
                        <span className="sb-ic"><Icon name={(e.type && TYPE[e.type]?.icon) || "vote"} /></span>
                        <span className="sb-title">{e.title || "Votación"}</span>
                      </a>
                      <button className="sb-more" aria-label={`Organizar «${e.title || "votación"}»`} aria-expanded={pOpen}
                        onClick={() => { setMenu(pOpen ? null : { type: "poll", id: e.id }); setForm(null); }}><Icon name="more" /></button>
                    </div>
                    {pOpen && pollMenu(e)}
                  </li>
                );
              }) : <li className="sb-hint">{hint}</li>}
            </ul>
          )}
        </section>
      );
    }).filter(Boolean);

    body = sections.length ? sections : total
      ? <div className="sb-empty">Ninguna votación coincide con «{query}».</div>
      : <div className="sb-empty">Aún no tienes votaciones.</div>;
  }

  return (
    <aside className={cls("sidebar", dragging && "dragging")} id="sidebar" aria-label="Mis votaciones" onKeyDown={onKeyDown}
      onClick={e => { if ((e.target as HTMLElement).closest("a")) onNavigate(); }}>
      <div className="sb-head">
        <a className="btn primary sb-new" href="#/nueva"><Icon name="plus" /> Nueva votación</a>
        <input className="input sb-search" type="search" placeholder="Buscar votación…" autoComplete="off"
          aria-label="Buscar votación" value={query} onChange={e => { setQuery(e.target.value); setMenu(null); }} />
      </div>
      <nav className="sb-body" id="sb-body" aria-label="Mis votaciones">{body}</nav>
      <div className="sb-foot" id="sb-foot">
        {lib && !library.error && (form?.mode === "new" ? formHTML()
          : <button className="sb-add" onClick={() => { setMenu(null); setForm({ mode: "new", value: "" }); }}><Icon name="plus" /> Nuevo grupo</button>)}
        {lib && archivedCount > 0 && (
          <a className="sb-all" href="#/" onClick={() => setHomeFilter("archived")}><Icon name="archive" /> Archivadas ({archivedCount})</a>
        )}
      </div>
    </aside>
  );
}
