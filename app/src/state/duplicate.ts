// Duplicar una votación: se deja una plantilla y "Nueva votación" la recoge al abrirse.
import { useCallback } from "react";
import * as D from "../lib/dates";
import { MAX_PEOPLE, hoursForDay } from "../lib/model";
import type { Poll, PollType } from "../lib/types";
import { navigate } from "./route";
import { useSession } from "./session";
import { useUi } from "./ui";

/** Datos con los que se abre "Nueva votación" al duplicar (sin votos ni fechas pasadas). */
export interface CreateTemplate {
  title: string;
  description: string;
  type: PollType;
  months: string[];
  days: string[];
  weeks: string[];
  count: number;
  opts: { name: string; icon: string }[];
  from: string;
  to: string;
  step: number;
  hourMode: "range" | "list";
  hoursByDay: Record<string, string[]>;
  anonymous: boolean;
  access: "open" | "approval" | "emails";
  emailsText: string;
  maxText: string;
  groupId: string;
}

const TITLE_MAX = 120; // el mismo tope que el campo del nombre
const SUFFIX = " (copia)";
const STEPS = [30, 60, 120]; // duraciones que ofrece el formulario

let pending: { tpl: CreateTemplate; at: number } | null = null;

/**
 * La plantilla solo vale para la navegación que la acaba de dejar: si "Nueva votación" se abre
 * más tarde, o se recarga la página, el formulario sale en blanco y no con una copia vieja.
 */
export const takeTemplate = (): CreateTemplate | null =>
  pending && Date.now() - pending.at < 5000 ? pending.tpl : null;

function templateFromPoll(poll: Poll, extra: { groupId: string | null; emails?: string[] }): CreateTemplate {
  const today = D.todayKey();
  const months = poll.months.filter(m => m >= D.currentMonthKey());
  const days = poll.type === "days" || poll.type === "hours" ? poll.slots.filter(k => k >= today) : [];
  const weeks = poll.type === "weeks" ? poll.slots.filter(w => D.weekEndKey(w) >= today) : [];
  const options = poll.options || [];
  const hours = poll.hours || [];
  const step = STEPS.includes(poll.hourStep || 0) ? (poll.hourStep as number) : 60;
  const hoursByDay: Record<string, string[]> = {};
  if (poll.hourList) days.forEach(d => { const hs = hoursForDay(poll, d); if (hs.length) hoursByDay[d] = [...hs].sort(); });
  return {
    title: poll.title.length + SUFFIX.length > TITLE_MAX
      ? poll.title.slice(0, TITLE_MAX - SUFFIX.length - 1) + "…" + SUFFIX
      : poll.title + SUFFIX,
    description: poll.description || "",
    type: poll.type,
    months,
    days,
    weeks,
    count: options.length || 1,
    opts: options.map(o => ({ name: o.name, icon: o.icon })),
    from: hours[0] || "09:00",
    to: hours.length ? D.hhmm(D.minutesOf(hours[hours.length - 1]) + step) : "21:00",
    step,
    hourMode: poll.hourList ? "list" : "range",
    hoursByDay,
    anonymous: !!poll.anonymous,
    access: poll.emailsOnly ? "emails" : poll.approval ? "approval" : "open",
    emailsText: (extra.emails || []).join(", "),
    maxText: poll.maxPeople && poll.maxPeople !== MAX_PEOPLE ? String(poll.maxPeople) : "",
    groupId: extra.groupId || "",
  };
}

/** Abre "Nueva votación" con los datos de `poll` ya rellenados. */
export function useDuplicate() {
  const { store, user, library } = useSession();
  const { toast } = useUi();
  return useCallback(async (poll: Poll) => {
    let emails: string[] | undefined;
    if (poll.emailsOnly && poll.ownerUid === user.uid) {
      // Los correos permitidos solo los lee el creador; si no se pueden leer, se escriben a mano.
      try { emails = (await store.getAccess(poll.id))?.emails; } catch { /* nada */ }
    }
    const groupId = library.data?.polls[poll.id]?.groupId ?? null;
    pending = { tpl: templateFromPoll(poll, { groupId, emails }), at: Date.now() };
    navigate("/nueva");
    toast("Copia lista: revísala y pulsa «Crear votación»");
  }, [store, user.uid, library.data, toast]);
}
