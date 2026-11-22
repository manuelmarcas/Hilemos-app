import { describe, expect, it } from "vitest";
import {
  TOP_N, acceptedVotes, deadlinePassed, fmtDeadline, isAdmin, isFinal, isFull, isRemoved, keepsVotesOnLeave, lostVotedUnit,
  managedPeople, memberStatus, parseEmails, pickHeir, pollMeta, pollRange, repeatCandidates, roleOf, slotKeys, tally,
  tiebreakShift, tiebreakTally, tiebreakUnsolved, unitParts, validUnits, winnerKey, withTiebreakAdjusted,
} from "./model";
import type { Poll, PollData, Vote, Votes } from "./types";

// Diciembre de 2025: el lunes es el 15 y el martes el 16.
const COMIDA = { id: "c", name: "Comida", icon: "🍽️" };
const CENA = { id: "n", name: "Cena", icon: "🌙" };

const days = (extra: Partial<PollData> = {}): Poll => ({
  id: "p1", title: "Cena de Navidad", type: "days", months: ["2025-12"], ownerUid: "owner",
  slots: ["2025-12-15", "2025-12-16", "2025-12-17"], options: [COMIDA, CENA], ...extra,
});
const vote = (name: string, picks: string[], extra: Vote = {}): Vote => ({ name, picks, ...extra });

describe("tally (recuento)", () => {
  const votes: Votes = {
    ana: vote("Ana", ["2025-12-15|c", "2025-12-16|c", "2025-12-16|n"]),
    bea: vote("Bea", ["2025-12-16|c", "2025-12-17|n"]),
    carlos: vote("Carlos", ["2025-12-16|c", "2025-12-15|c"]),
  };

  it("cuenta los votos de cada casilla y opción", () => {
    const T = tally(days(), votes);
    expect(T.counts).toEqual({ "2025-12-15|c": 2, "2025-12-16|c": 3, "2025-12-16|n": 1, "2025-12-17|n": 1 });
    expect(T.voters["2025-12-16|c"]).toEqual(["ana", "bea", "carlos"]);
  });

  it("ignora votos repetidos y a casillas que no existen", () => {
    const T = tally(days(), {
      ana: vote("Ana", ["2025-12-15|c", "2025-12-15|c", "2025-12-20|c", "2025-12-15|x"]),
    });
    expect(T.counts).toEqual({ "2025-12-15|c": 1 });
    expect(T.people[0].total).toBe(1);
  });

  it("los empates comparten puesto (1, 1, 3…) y gana la casilla más temprana al ordenar", () => {
    const T = tally(days(), {
      a: vote("A", ["2025-12-17|c", "2025-12-15|n", "2025-12-16|c"]),
      b: vote("B", ["2025-12-17|c", "2025-12-15|n"]),
    });
    expect(T.ranking.map(e => [e.key, e.rank])).toEqual([
      ["2025-12-15|n", 1], ["2025-12-17|c", 1], ["2025-12-16|c", 3],
    ]);
    expect(T.leaders.map(e => e.key)).toEqual(["2025-12-15|n", "2025-12-17|c"]);
  });

  it("con los mismos votos y la misma casilla, va antes la primera opción", () => {
    const T = tally(days(), { a: vote("A", ["2025-12-15|n", "2025-12-15|c"]) });
    expect(T.ranking.map(e => e.key)).toEqual(["2025-12-15|c", "2025-12-15|n"]);
  });

  it("marca lo más votado de cada opción por separado", () => {
    const T = tally(days(), votes);
    expect([...T.best].sort()).toEqual(["2025-12-16|c", "2025-12-16|n", "2025-12-17|n"]);
  });

  it("«más votadas» enseña como mucho TOP_N", () => {
    const poll = days({ slots: ["2025-12-15", "2025-12-16", "2025-12-17", "2025-12-18"] });
    const all = [...validUnits(poll)];
    const T = tally(poll, { a: vote("A", all) });
    expect(T.ranking).toHaveLength(all.length);
    expect(T.top).toHaveLength(TOP_N);
  });

  it("resume cada persona por opción, ordenadas por nombre en castellano", () => {
    const T = tally(days(), { ...votes, nadie: {}, zoe: vote("Álvaro", []) });
    expect(T.people.map(p => p.name)).toEqual(["Alguien", "Álvaro", "Ana", "Bea", "Carlos"]);
    const ana = T.people.find(p => p.uid === "ana")!;
    expect(ana.perOpt).toEqual({ c: 2, n: 1 });
    expect(ana.picks).toEqual(["2025-12-15|c", "2025-12-16|c", "2025-12-16|n"]);
  });

  it("una votación sin votos no tiene líderes", () => {
    const T = tally(days(), {});
    expect(T.ranking).toEqual([]);
    expect(T.leaders).toEqual([]);
    expect(T.best.size).toBe(0);
  });

  it("en las votaciones que no son de días hay una sola opción", () => {
    const poll: Poll = { ...days(), type: "weeks", slots: ["2025-12-15", "2025-12-22"], options: undefined };
    const T = tally(poll, { a: vote("A", ["2025-12-22|v", "2025-12-22|c"]) });
    expect(T.counts).toEqual({ "2025-12-22|v": 1 });
  });

  it("en las de opciones libres cada opción es una casilla", () => {
    const poll: Poll = {
      ...days(), type: "options", slots: [], options: [{ id: "o1", name: "Pizza", icon: "🍕" }, { id: "o2", name: "Sushi", icon: "" }],
    };
    expect(slotKeys(poll)).toEqual(["o1", "o2"]);
    const T = tally(poll, { a: vote("A", ["o2|v"]), b: vote("B", ["o2|v", "o1|v"]) });
    expect(T.leaders.map(e => e.key)).toEqual(["o2|v"]);
  });
});

describe("casillas de horas", () => {
  it("franjas periódicas: las mismas horas cada día", () => {
    const poll: PollData = { ...days(), type: "hours", slots: ["2025-12-15", "2025-12-16"], hours: ["10:00", "11:00"], hourStep: 60 };
    expect(slotKeys(poll)).toEqual(["2025-12-15T10:00", "2025-12-15T11:00", "2025-12-16T10:00", "2025-12-16T11:00"]);
  });

  it("horas sueltas: cada día las suyas", () => {
    const poll: PollData = {
      ...days(), type: "hours", slots: ["2025-12-15", "2025-12-16"], hours: [], hourStep: 0, hourList: true,
      hoursByDay: { "2025-12-15": ["09:30"], "2025-12-16": ["18:00", "19:15"] },
    };
    expect(slotKeys(poll)).toEqual(["2025-12-15T09:30", "2025-12-16T18:00", "2025-12-16T19:15"]);
  });

  it("separa la casilla de la opción aunque la casilla lleve hora", () => {
    expect(unitParts("2025-12-15T10:00|v")).toEqual({ slot: "2025-12-15T10:00", optId: "v" });
  });
});

describe("tiebreakTally (desempate)", () => {
  const poll = days({ closed: true, tiebreak: { id: 7, candidates: ["2025-12-15|c", "2025-12-16|c"], done: false } });

  it("solo cuentan los votos de esta ronda a una candidata", () => {
    const TB = tiebreakTally(poll, {
      a: { tb: { id: 7, pick: "2025-12-15|c" } },
      b: { tb: { id: 7, pick: "2025-12-15|c" } },
      c: { tb: { id: 7, pick: "2025-12-16|c" } },
      viejo: { tb: { id: 6, pick: "2025-12-16|c" } },
      raro: { tb: { id: 7, pick: "2025-12-17|n" } },
      sin: {},
    })!;
    expect(TB.counts).toEqual({ "2025-12-15|c": 2, "2025-12-16|c": 1 });
    expect(TB.voters["2025-12-15|c"]).toEqual(["a", "b"]);
    expect(TB.total).toBe(3);
    expect(TB.max).toBe(2);
    expect(TB.leaders).toEqual(["2025-12-15|c"]);
  });

  it("sin votos no hay líderes", () => {
    const TB = tiebreakTally(poll, {})!;
    expect(TB.max).toBe(0);
    expect(TB.leaders).toEqual([]);
  });

  it("sin desempate devuelve null", () => {
    expect(tiebreakTally(days(), {})).toBeNull();
  });

  it("final, sin resolver y entre qué opciones se repite", () => {
    const base = tiebreakTally({ ...poll, tiebreak: { ...poll.tiebreak!, done: true } }, {
      a: { tb: { id: 7, pick: "2025-12-15|c" } },
    })!;
    expect(isFinal(base)).toBe(true);
    expect(tiebreakUnsolved(base)).toBe(false);

    const empate = { ...base, leaders: ["2025-12-15|c", "2025-12-16|c"] };
    expect(isFinal(empate)).toBe(false);
    expect(tiebreakUnsolved(empate)).toBe(true);
    expect(repeatCandidates(empate)).toEqual(["2025-12-15|c", "2025-12-16|c"]);

    const nadie = { ...base, leaders: [] };
    expect(tiebreakUnsolved(nadie)).toBe(true);
    expect(repeatCandidates(nadie)).toEqual(base.candidates);

    const abierto = { ...base, done: false };
    expect(isFinal(abierto)).toBe(false);
    expect(tiebreakUnsolved(abierto)).toBe(false);
    expect(isFinal(null)).toBe(false);
  });
});

describe("desempate cuando alguien deja de participar", () => {
  const A = "2025-12-15|c", B = "2025-12-16|c", C = "2025-12-17|c";
  const closed = (candidates: string[], extra: Partial<PollData> = {}) =>
    days({ closed: true, tiebreak: { id: 3, candidates, done: false }, ...extra });
  const triple: Votes = { a: vote("A", [A]), b: vote("B", [B]), c: vote("C", [C]) };

  it("si las empatadas siguen siendo las mismas, no cambia nada", () => {
    const poll = closed([A, B, C]);
    const T = tally(poll, triple);
    expect(tiebreakShift(poll, T)).toBeNull();
    expect(withTiebreakAdjusted(poll, T)).toBe(poll);
  });

  it("no se toca si la votación está abierta, sin desempate o con él terminado", () => {
    const T = tally(days(), { a: vote("A", [A]) });
    expect(tiebreakShift(days({ tiebreak: { id: 3, candidates: [A, B], done: false } }), T)).toBeNull();
    expect(tiebreakShift(days({ closed: true }), T)).toBeNull();
    expect(tiebreakShift(closed([A, B], { tiebreak: { id: 3, candidates: [A, B], done: true } }), T)).toBeNull();
  });

  it("si quedan dos o más empatadas, el desempate sigue solo entre ellas", () => {
    const poll = closed([A, B, C]);
    const { c: _, ...sinC } = triple;
    const T = tally(poll, sinC);
    expect(tiebreakShift(poll, T)).toEqual([A, B]);
    const adj = withTiebreakAdjusted(poll, T);
    expect(adj.tiebreak).toEqual({ id: 3, candidates: [A, B], done: false });
    expect(adj.tbNote).toEqual({ at: 0, solved: false, tb: 3, n: 2 });
  });

  it("si ya no hay empate, se quita el desempate", () => {
    const poll = closed([A, B]);
    const T = tally(poll, { a: vote("A", [A]) });
    const adj = withTiebreakAdjusted(poll, T);
    expect(adj.tiebreak).toBeNull();
    expect(adj.tbNote).toEqual({ at: 0, solved: true });
  });
});

describe("lostVotedUnit (lo que no se puede quitar al editar)", () => {
  const votes: Votes = { a: vote("A", ["2025-12-15|c"]) };

  it("no se puede quitar un día con votos", () => {
    expect(lostVotedUnit(days(), days({ slots: ["2025-12-16", "2025-12-17"] }), votes)).toBe("2025-12-15|c");
  });

  it("sí se puede quitar un día sin votos o añadir días", () => {
    expect(lostVotedUnit(days(), days({ slots: ["2025-12-15", "2025-12-16"] }), votes)).toBeNull();
    expect(lostVotedUnit(days(), days({ slots: ["2025-12-15", "2025-12-16", "2025-12-17", "2025-12-18"] }), votes)).toBeNull();
  });

  it("no se puede quitar una opción con votos, pero sí renombrarla", () => {
    expect(lostVotedUnit(days(), days({ options: [CENA] }), votes)).toBe("2025-12-15|c");
    expect(lostVotedUnit(days(), days({ options: [{ ...COMIDA, name: "Almuerzo" }, CENA] }), votes)).toBeNull();
    expect(lostVotedUnit(days(), days({ options: [COMIDA] }), votes)).toBeNull();
  });

  it("no cuentan los votos a casillas que ya no existían", () => {
    expect(lostVotedUnit(days(), days({ slots: ["2025-12-16"] }), { a: vote("A", ["2025-12-01|c"]) })).toBeNull();
  });

  it("en horas, no se puede quitar una franja con votos", () => {
    const h = (hours: string[]): PollData => ({ ...days(), type: "hours", slots: ["2025-12-15"], hours, hourStep: 60 });
    const v = { a: vote("A", ["2025-12-15T10:00|v"]) };
    expect(lostVotedUnit(h(["10:00", "11:00"]), h(["11:00"]), v)).toBe("2025-12-15T10:00|v");
    expect(lostVotedUnit(h(["10:00", "11:00"]), h(["10:00"]), v)).toBeNull();
  });
});

describe("participantes", () => {
  it("estado: sin campo es aceptado", () => {
    expect(memberStatus({})).toBe("accepted");
    expect(memberStatus(null)).toBe("accepted");
    expect(memberStatus({ status: "pending" })).toBe("pending");
    expect(memberStatus({ status: "rejected" })).toBe("rejected");
  });

  it("solo cuentan los aceptados", () => {
    const v: Votes = { a: {}, b: { status: "pending" }, c: { status: "rejected" }, d: { gone: true } };
    expect(Object.keys(acceptedVotes(v))).toEqual(["a", "d"]);
  });

  it("administra el creador o un administrador nombrado", () => {
    const p = days({ admins: ["bea"] });
    expect(isAdmin(p, "owner")).toBe(true);
    expect(isAdmin(p, "bea")).toBe(true);
    expect(isAdmin(p, "carlos")).toBe(false);
    expect(isAdmin(days(), "bea")).toBe(false);
  });

  it("llena solo si tiene tope y lo alcanza", () => {
    expect(isFull(days({ maxPeople: 3, members: 3 }))).toBe(true);
    expect(isFull(days({ maxPeople: 3, members: 2 }))).toBe(false);
    expect(isFull(days({ members: 500 }))).toBe(false);
  });
});

describe("pickHeir (quién hereda la votación)", () => {
  const votes: Votes = {
    owner: {}, ana: {}, bea: {}, pend: { status: "pending" }, ido: { gone: true },
  };

  it("prefiere a un administrador", () => {
    for (let i = 0; i < 20; i++) expect(pickHeir(votes, "owner", ["bea", "ido"])).toBe("bea");
  });

  it("si no hay administradores, cualquier aceptado que siga (nunca pendientes ni idos ni quien se va)", () => {
    const seen = new Set<string | null>();
    for (let i = 0; i < 50; i++) seen.add(pickHeir(votes, "owner"));
    expect([...seen].sort()).toEqual(["ana", "bea"]);
  });

  it("si no queda nadie, null", () => {
    expect(pickHeir({ owner: {}, ido: { gone: true } }, "owner")).toBeNull();
  });
});

describe("plazo y salida", () => {
  const now = new Date(2025, 11, 20, 12, 0).getTime();

  it("el plazo pasa justo a su hora", () => {
    expect(deadlinePassed(days({ deadline: now }), now)).toBe(true);
    expect(deadlinePassed(days({ deadline: now + 1 }), now)).toBe(false);
    expect(deadlinePassed(days({ deadline: 0 }), now)).toBe(false);
    expect(deadlinePassed(days(), now)).toBe(false);
  });

  it("la hora del plazo solo sale si no acaba con el día", () => {
    expect(fmtDeadline(new Date(2025, 11, 17, 23, 59).getTime())).toBe("mié 17 dic");
    expect(fmtDeadline(new Date(2025, 11, 17, 9, 5).getTime())).toBe("mié 17 dic, 09:05");
  });

  it("quien se va deja sus votos solo si ya no se puede votar y no hay desempate abierto", () => {
    expect(keepsVotesOnLeave(days())).toBe(false);
    expect(keepsVotesOnLeave(days({ closed: true }))).toBe(true);
    expect(keepsVotesOnLeave(days({ deadline: 1 }))).toBe(true);
    expect(keepsVotesOnLeave(days({ closed: true, tiebreak: { id: 1, candidates: [], done: false } }))).toBe(false);
    expect(keepsVotesOnLeave(days({ closed: true, tiebreak: { id: 1, candidates: [], done: true } }))).toBe(true);
  });
});

describe("parseEmails", () => {
  it("separa por comas, espacios, punto y coma y saltos de línea; en minúsculas y sin repetir", () => {
    const r = parseEmails("Ana@Correo.es, bea@x.com;\n<carlos@y.org>  ana@correo.es");
    expect(r.emails).toEqual(["ana@correo.es", "bea@x.com", "carlos@y.org"]);
    expect(r.invalid).toEqual([]);
  });

  it("devuelve los que no son correos tal como se escribieron", () => {
    const r = parseEmails("bien@x.com Mal@sinpunto nada");
    expect(r.emails).toEqual(["bien@x.com"]);
    expect(r.invalid).toEqual(["Mal@sinpunto", "nada"]);
  });

  it("vacío", () => {
    expect(parseEmails("  \n ")).toEqual({ emails: [], invalid: [] });
  });
});

describe("textos de la votación", () => {
  it("pollMeta", () => {
    expect(pollMeta(days())).toBe("Días · 3 días · 2 opciones por día");
    expect(pollMeta({ ...days(), type: "hours", slots: ["2025-12-15"], hours: ["10:00"], hourStep: 60 }))
      .toBe("Horas · 1 día · 1 franja por día");
    expect(pollMeta({
      ...days(), type: "hours", slots: ["2025-12-15", "2025-12-16"], hourList: true,
      hoursByDay: { "2025-12-15": ["09:00"], "2025-12-16": ["10:00", "11:00"] },
    })).toBe("Horas · 2 días · 3 horas en total");
  });

  it("pollRange: seguidos o sueltos", () => {
    expect(pollRange(days())).toBe("Solo se puede votar del 15 de diciembre al 17 de diciembre.");
    expect(pollRange(days({ slots: ["2025-12-15", "2025-12-18"] })))
      .toBe("2 días disponibles entre el 15 de diciembre y el 18 de diciembre.");
    expect(pollRange(days({ slots: ["2025-12-16"] }))).toBe("Se vota el martes 16 de diciembre.");
    expect(pollRange({ ...days(), type: "months", slots: ["2026-01", "2025-12"] }))
      .toBe("Se vota entre diciembre 2025 y enero 2026.");
  });
});

describe("papeles y «Gestionar participantes»", () => {
  const votes: Votes = {
    owner: vote("Olga", []), adm: vote("Adri", []), bea: vote("Bea", []), ana: vote("Ana", []),
    fuera: vote("Fermín", [], { status: "rejected", removed: true }),
    pend: vote("Pepa", [], { status: "pending" }),
    rech: vote("Rita", [], { status: "rejected" }),
    ido: vote("Ido", [], { gone: true }),
  };
  const poll = days({ admins: ["adm"] });

  it("roleOf: creador, delegado (si el creador se fue) y admin", () => {
    expect(roleOf(poll, "owner")).toBe("creator");
    expect(roleOf(poll, "adm")).toBe("admin");
    expect(roleOf(poll, "bea")).toBeNull();
    const passed = days({ ownerUid: "bea", founder: "ido", admins: ["adm"] });
    expect(roleOf(passed, "bea")).toBe("delegate");
    expect(roleOf(passed, "ido")).toBe("creator");
  });

  it("isRemoved: solo quien fue expulsado, no a quien se rechazó al pedir entrar", () => {
    expect(isRemoved(votes.fuera)).toBe(true);
    expect(isRemoved(votes.rech)).toBe(false);
    expect(isRemoved(votes.ana)).toBe(false);
  });

  it("el creador ve primero a quien la gestiona y a los administradores; puede nombrar y expulsar a todos menos a sí mismo", () => {
    const { inside, removed } = managedPeople(poll, votes, "owner");
    expect(inside.map(p => p.uid)).toEqual(["owner", "adm", "ana", "bea"]);
    expect(removed.map(p => p.uid)).toEqual(["fuera"]);
    const by = Object.fromEntries(inside.map(p => [p.uid, p]));
    expect(by.owner.canToggleAdmin || by.owner.canRemove).toBe(false);
    expect(by.adm.canToggleAdmin && by.adm.canRemove).toBe(true);
    expect(by.ana.canToggleAdmin && by.ana.canRemove).toBe(true);
  });

  it("un administrador expulsa a participantes, pero no nombra administradores ni expulsa a otro administrador", () => {
    const poll2 = days({ admins: ["adm", "bea"] });
    const by = Object.fromEntries(managedPeople(poll2, votes, "adm").inside.map(p => [p.uid, p]));
    expect(by.ana.canRemove).toBe(true);
    expect(by.ana.canToggleAdmin).toBe(false);
    expect(by.bea.canRemove).toBe(false);
    expect(by.owner.canRemove).toBe(false);
    expect(by.adm.canRemove).toBe(false);
  });

  it("un participante no puede hacer nada", () => {
    const { inside } = managedPeople(poll, votes, "ana");
    expect(inside.some(p => p.canRemove || p.canToggleAdmin)).toBe(false);
  });
});

describe("winnerKey (la ganadora)", () => {
  it("sin desempate, la única más votada; con empate, ninguna", () => {
    expect(winnerKey(tally(days(), { a: vote("A", ["2025-12-15|c"]) }), null)).toBe("2025-12-15|c");
    expect(winnerKey(tally(days(), { a: vote("A", ["2025-12-15|c", "2025-12-16|c"]) }), null)).toBeNull();
  });

  it("con desempate, solo la del desempate finalizado con una en cabeza", () => {
    const votes: Votes = {
      a: vote("A", ["2025-12-15|c", "2025-12-16|c"], { tb: { id: 1, pick: "2025-12-16|c" } }),
    };
    const open = days({ closed: true, tiebreak: { id: 1, candidates: ["2025-12-15|c", "2025-12-16|c"], done: false } });
    const done = { ...open, tiebreak: { ...open.tiebreak!, done: true } };
    const T = tally(open, votes);
    expect(winnerKey(T, tiebreakTally(open, votes))).toBeNull();
    expect(winnerKey(T, tiebreakTally(done, votes))).toBe("2025-12-16|c");
  });
});
