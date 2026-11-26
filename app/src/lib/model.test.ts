import { describe, expect, it } from "vitest";
import {
  TOP_N, acceptedVotes, chatSince, deadlinePassed, hasUnreadChat, fmtDeadline, isAdmin, isFinal, isFull, isRemoved, keepsVotesOnLeave, losingAccess, lostVotedUnit,
  autoClose, autoCloseNote, closingLabel, hasPremiumSettings, sysTextFor, managedPeople, memberStatus, minMaxPeople, openManaged, pollForExport, reportsByMessage, reportsByPerson, parseEmails, pickHeir, pollMeta, pollRange, repeatCandidates, roleOf, slotKeys, tally,
  tiebreakShift, tiebreakTally, tiebreakUnsolved, unitParts, validUnits, winnerKey, withTiebreakAdjusted,
} from "./model";
import type { Poll, PollData, Vote, Votes } from "./types";
import { mustUpdate } from "../state/appConfig";

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
    expect(pollMeta(days())).toBe("3 días");
    expect(pollMeta({ ...days(), type: "hours", slots: ["2025-12-15"], hours: ["10:00"], hourStep: 60 })).toBe("1 día");
    expect(pollMeta({ ...days(), type: "weeks", slots: ["2025-12-15", "2025-12-22"] })).toBe("2 semanas");
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

describe("minMaxPeople (lo menos que se puede poner de máximo)", () => {
  it("las plazas ocupadas, y nunca menos de 2", () => {
    expect(minMaxPeople(days({ maxPeople: 20, members: 12 }))).toBe(12);
    expect(minMaxPeople(days({ maxPeople: 20, members: 1 }))).toBe(2);
    expect(minMaxPeople(days())).toBe(2);
  });
});

describe("chatSince", () => {
  const p = { ownerUid: "ana" } as PollData;
  it("quien crea la votación ve todo el chat", () => expect(chatSince(p, "ana", { joinedAt: 500 })).toBe(0));
  it("los demás, desde que entraron", () => expect(chatSince(p, "bea", { joinedAt: 500 })).toBe(500));
  it("los votos de antes (sin joinedAt) lo ven todo", () => expect(chatSince(p, "bea", { name: "Bea" })).toBe(0));
  it("sin voto, todo", () => expect(chatSince(p, "bea", null)).toBe(0));
});

describe("losingAccess (quitar correos de la lista de una privada)", () => {
  const poll = days({ emailsOnly: true, admins: ["adm"] });
  const votes: Votes = {
    owner: vote("Olga", []), bea: vote("Bea", []), adm: vote("Adri", []), pep: vote("Pepa", [], { status: "pending" }),
    fuera: vote("Fermín", [], { status: "rejected", removed: true }), ido: vote("Ido", [], { gone: true }),
  };
  const emails = { owner: "olga@x.es", bea: "bea@x.es", adm: "adri@x.es", pep: "pepa@x.es", fuera: "fermin@x.es", ido: "ido@x.es" };
  const all = Object.values(emails);

  it("quien sigue dentro (o pendiente) con un correo que se quita; sin mayúsculas que importen", () => {
    const out = losingAccess(poll, votes, emails, all, ["OLGA@x.es", "adri@x.es"]);
    expect(out.map(p => [p.uid, p.pending, p.admin])).toEqual([["bea", false, false], ["pep", true, false]]);
  });

  it("nunca quien la gestiona, ni quien ya no está (expulsado o se fue)", () => {
    expect(losingAccess(poll, votes, emails, all, [])).toHaveLength(3); // Adri (admin), Bea y Pepa
    expect(losingAccess(poll, votes, emails, all, []).some(p => ["owner", "fuera", "ido"].includes(p.uid))).toBe(false);
  });

  it("sin quitar nada, o sin saber su correo, nadie", () => {
    expect(losingAccess(poll, votes, emails, all, all)).toEqual([]);
    expect(losingAccess(poll, votes, {}, all, [])).toEqual([]);
  });
});

describe("reportsByMessage (denuncias por mensaje)", () => {
  it("agrupa las denuncias de cada mensaje", () => {
    const r = (msgId: string, by: string) => ({ id: `${msgId}_${by}`, msgId, msgUid: "x", msgName: "X", msgText: "t", by, byName: by, reason: "spam" as const, at: 1 });
    const m = reportsByMessage([r("m1", "a"), r("m2", "a"), r("m1", "b")]);
    expect(m.get("m1")?.map(x => x.by)).toEqual(["a", "b"]);
    expect(m.get("m2")).toHaveLength(1);
    expect(m.get("m3")).toBeUndefined();
  });
});

describe("reportsByPerson (denuncias por persona)", () => {
  it("agrupa las denuncias de cada persona denunciada", () => {
    const r = (targetUid: string, by: string) => ({ id: `${targetUid}_${by}`, targetUid, targetName: "X", by, byName: by, reason: "ofensivo" as const, at: 1 });
    const m = reportsByPerson([r("ana", "a"), r("luis", "a"), r("ana", "b")]);
    expect(m.get("ana")?.map(x => x.by)).toEqual(["a", "b"]);
    expect(m.get("luis")).toHaveLength(1);
    expect(m.get("marta")).toBeUndefined();
  });
});

describe("pollForExport (Descargar mis datos)", () => {
  const p = { title: "Cena", type: "days", months: [], slots: [], ownerUid: "u2", ownerName: "Luis", admins: ["u3"], createdAt: 5 } as PollData;
  it("solo lo que describe la votación, sin uids de los demás", () => {
    expect(pollForExport(p, "u1")).toEqual({
      title: "Cena", description: undefined, type: "days", createdAt: 5, closed: undefined, ownerName: "Luis", iCreatedIt: false,
    });
  });
  it("la creó quien la fundó, aunque ahora la gestione otra persona", () => {
    expect(pollForExport(p, "u2")?.iCreatedIt).toBe(true);
    expect(pollForExport({ ...p, founder: "u1" }, "u1")?.iCreatedIt).toBe(true);
    expect(pollForExport({ ...p, founder: "u1" }, "u2")?.iCreatedIt).toBe(false);
    expect(pollForExport(null, "u1")).toBeNull();
  });
});

describe("hasPremiumSettings y openManaged (marcas de premium)", () => {
  const base = { title: "x", type: "days", months: [], slots: [], ownerUid: "ana" } as PollData;
  it("plazo, aprobación, solo correos, administradores o más de 20 personas", () => {
    expect(hasPremiumSettings(base)).toBe(false);
    expect(hasPremiumSettings({ ...base, maxPeople: 150, members: 20 })).toBe(false);
    expect(hasPremiumSettings({ ...base, members: 21 })).toBe(true);
    expect(hasPremiumSettings({ ...base, deadline: 1 })).toBe(true);
    expect(hasPremiumSettings({ ...base, approval: true })).toBe(true);
    expect(hasPremiumSettings({ ...base, emailsOnly: true })).toBe(true);
    expect(hasPremiumSettings({ ...base, admins: [] })).toBe(false);
    expect(hasPremiumSettings({ ...base, admins: ["luis"] })).toBe(true);
  });
  it("cuenta las abiertas que gestiona: ni cerradas, ni con el plazo pasado, ni ajenas", () => {
    const polls = [base, { ...base, closed: true }, { ...base, deadline: 1 }, { ...base, ownerUid: "luis" }, null, { ...base, deadline: Date.now() + 1e6 }];
    expect(openManaged(polls, "ana")).toBe(2);
  });
});

describe("autoClose y autoCloseNote (cuenta atrás que pone el servidor)", () => {
  const base = { title: "x", type: "days", months: [], slots: [], ownerUid: "ana" } as PollData;
  const now = Date.UTC(2026, 11, 1, 12);
  it("solo si sigue abierta, con el motivo que llega antes", () => {
    expect(autoClose(base, now)).toBeNull();
    const p = { ...base, autoCloseAt: now + 5, autoCloseWhy: { premium: now + 9, limit: now + 5 } };
    expect(autoClose(p, now)).toEqual({ at: now + 5, reason: "limit" });
    expect(autoClose({ ...p, autoCloseAt: now + 9, autoCloseWhy: { premium: now + 9 } }, now)).toEqual({ at: now + 9, reason: "premium" });
    expect(autoClose({ ...p, closed: true }, now)).toBeNull();
    expect(autoClose({ ...p, deadline: now }, now)).toBeNull();
    // Un plazo que llega antes la cierra primero: la cuenta atrás no cuenta.
    expect(autoClose({ ...p, deadline: now + 3 }, now)).toBeNull();
    expect(autoClose({ ...p, deadline: now + 7 }, now)).toEqual({ at: now + 5, reason: "limit" });
  });
  it("la etiqueta cuenta los días que quedan, hasta «Último día»", () => {
    const at = new Date(2026, 11, 8, 23, 59).getTime(); // se cierra al acabar el 8 de diciembre
    expect(closingLabel(at, new Date(2026, 11, 1, 10).getTime())).toBe("Se cierra en 7 días");
    expect(closingLabel(at, new Date(2026, 11, 6, 23, 0).getTime())).toBe("Se cierra en 2 días");
    expect(closingLabel(at, new Date(2026, 11, 7, 0, 30).getTime())).toBe("Se cierra mañana");
    expect(closingLabel(at, new Date(2026, 11, 8, 0, 1).getTime())).toBe("Último día");
    expect(closingLabel(at, new Date(2026, 11, 8, 23, 58).getTime())).toBe("Último día");
    // Con el cambio de hora por medio (25 de octubre) siguen siendo días enteros.
    expect(closingLabel(new Date(2026, 9, 27, 23, 59).getTime(), new Date(2026, 9, 24, 12).getTime())).toBe("Se cierra en 3 días");
  });
  it("a quien la gestiona le dice qué hacer; a los demás, solo por qué", () => {
    expect(autoCloseNote("limit", now, true)).toMatch(/Cierra otra/);
    expect(autoCloseNote("limit", now, false)).toMatch(/Quien la gestiona/);
    expect(autoCloseNote("premium", now, true)).toMatch(/Con premium/);
    expect(autoCloseNote("premium", now, false)).not.toMatch(/Con premium/);
  });
});

describe("mustUpdate (versión mínima de la app de Android)", () => {
  it("solo en la app y por debajo de la mínima", () => {
    expect(mustUpdate(null, 5)).toBe(false);
    expect(mustUpdate(4, undefined)).toBe(false);
    expect(mustUpdate(4, 5)).toBe(true);
    expect(mustUpdate(5, 5)).toBe(false);
  });
});

describe("sysTextFor (avisos del chat en segunda persona)", () => {
  it("lo que hiciste tú: «has…»", () => {
    expect(sysTextFor("ha añadido el martes 16 de diciembre", true, "Ana")).toBe("has añadido el martes 16 de diciembre");
  });
  it("lo que habla de ti: «te…»", () => {
    expect(sysTextFor("ha vuelto a admitir a Cris", false, "Cris")).toBe("te ha vuelto a admitir");
  });
  it("lo de los demás, igual", () => {
    expect(sysTextFor("ha vuelto a admitir a Cris", false, "Bea")).toBe("ha vuelto a admitir a Cris");
    expect(sysTextFor("ha cambiado el título", false, "")).toBe("ha cambiado el título");
  });
});

describe("hasUnreadChat (icono de mensajes sin leer en «Mis votaciones»)", () => {
  const p = (chatAt?: number, chatBy = "otro") => ({ ...days(), chatAt, chatBy });
  it("sin mensajes o con todo visto, no", () => {
    expect(hasUnreadChat({}, p(), "yo")).toBe(false);
    expect(hasUnreadChat({ chatSeenAt: 100 }, p(100), "yo")).toBe(false);
    expect(hasUnreadChat({ chatSeenAt: 150 }, p(100), "yo")).toBe(false);
  });
  it("un mensaje de otro posterior a lo visto, sí", () => {
    expect(hasUnreadChat({ chatSeenAt: 50 }, p(100), "yo")).toBe(true);
    expect(hasUnreadChat({}, p(100), "yo")).toBe(true);
  });
  it("el último mensaje es tuyo (o el aviso de algo que has editado), no", () => {
    expect(hasUnreadChat({ chatSeenAt: 50 }, p(100, "yo"), "yo")).toBe(false);
  });
  it("lo de antes de añadirla a su lista no cuenta", () => {
    expect(hasUnreadChat({ addedAt: 200 }, p(100), "yo")).toBe(false);
    expect(hasUnreadChat({ addedAt: 50 }, p(100), "yo")).toBe(true);
  });
});
