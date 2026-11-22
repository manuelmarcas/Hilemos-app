import { describe, expect, it } from "vitest";
import { describeChanges } from "./changes";
import { MAX_CHAT } from "./model";
import type { PollData } from "./types";

// Diciembre de 2025: el lunes es el 15 y el martes el 16.
const COMIDA = { id: "c", name: "Comida", icon: "🍽️" };
const CENA = { id: "n", name: "Cena", icon: "🌙" };
const days = (extra: Partial<PollData> = {}): PollData => ({
  title: "Cena", type: "days", months: ["2025-12"], ownerUid: "owner",
  slots: ["2025-12-15"], options: [COMIDA], ...extra,
});

describe("describeChanges (avisos del chat al editar)", () => {
  it("sin cambios, nada que decir", () => {
    expect(describeChanges(days(), days())).toEqual([]);
  });

  it("título y descripción", () => {
    expect(describeChanges(days(), days({ title: "Comida" }))).toEqual(["ha cambiado el título: «Cena» → «Comida»"]);
    expect(describeChanges(days(), days({ description: "En casa" }))).toEqual(["ha cambiado la descripción: «En casa»"]);
    expect(describeChanges(days({ description: "En casa" }), days())).toEqual(["ha quitado la descripción"]);
    expect(describeChanges(days({ description: "" }), days())).toEqual([]);
  });

  it("un día añadido se nombra entero", () => {
    expect(describeChanges(days(), days({ slots: ["2025-12-15", "2025-12-16"] })))
      .toEqual(["ha añadido el martes 16 de diciembre"]);
  });

  it("varios días, en orden y en forma corta", () => {
    expect(describeChanges(days(), days({ slots: ["2025-12-17", "2025-12-15", "2025-12-16"] })))
      .toEqual(["ha añadido 2 días: mar 16 dic y mié 17 dic"]);
  });

  it("de una lista larga solo se nombran seis", () => {
    const slots = Array.from({ length: 10 }, (_, i) => `2025-12-${String(15 + i).padStart(2, "0")}`);
    const [t] = describeChanges(days({ slots: [] }), days({ slots }));
    expect(t).toBe("ha añadido 10 días: lun 15 dic, mar 16 dic, mié 17 dic, jue 18 dic, vie 19 dic, sáb 20 dic y 4 más");
  });

  it("añadir y quitar a la vez", () => {
    expect(describeChanges(days(), days({ slots: ["2025-12-16"] })))
      .toEqual(["ha añadido el martes 16 de diciembre", "ha quitado el lunes 15 de diciembre"]);
  });

  it("opciones de cada día: añadidas, quitadas y cambiadas", () => {
    expect(describeChanges(days(), days({ options: [COMIDA, CENA] }))).toEqual(["ha añadido la opción «🌙 Cena»"]);
    expect(describeChanges(days({ options: [COMIDA, CENA] }), days())).toEqual(["ha quitado la opción «🌙 Cena»"]);
    expect(describeChanges(days(), days({ options: [{ ...COMIDA, name: "Almuerzo" }] })))
      .toEqual(["ha cambiado la opción «🍽️ Comida» por «🍽️ Almuerzo»"]);
    expect(describeChanges(days({ options: [] }), days({ options: [COMIDA, CENA] })))
      .toEqual(["ha añadido 2 opciones de cada día: «🍽️ Comida» y «🌙 Cena»"]);
  });

  it("semanas y meses", () => {
    const w = (slots: string[]): PollData => ({ ...days(), type: "weeks", slots, options: undefined });
    expect(describeChanges(w(["2025-12-15"]), w(["2025-12-15", "2025-12-22"])))
      .toEqual(["ha añadido la semana del 22–28 dic"]);
    const m = (slots: string[]): PollData => ({ ...days(), type: "months", slots, options: undefined });
    expect(describeChanges(m(["2025-12"]), m(["2025-12", "2026-01", "2026-02"])))
      .toEqual(["ha añadido 2 meses: enero 2026 y febrero 2026"]);
  });

  it("opciones libres", () => {
    const o = (options: PollData["options"]): PollData => ({ ...days(), type: "options", slots: [], options });
    const pizza = { id: "o1", name: "Pizza", icon: "🍕" }, sushi = { id: "o2", name: "Sushi", icon: "" };
    expect(describeChanges(o([pizza]), o([pizza, sushi]))).toEqual(["ha añadido la opción «Sushi»"]);
    expect(describeChanges(o([pizza, sushi]), o([sushi]))).toEqual(["ha quitado la opción «🍕 Pizza»"]);
  });

  it("franjas periódicas: se nombran solo por su hora", () => {
    const h = (slots: string[], hours: string[]): PollData =>
      ({ ...days(), type: "hours", slots, hours, hourStep: 60, options: undefined });
    expect(describeChanges(h(["2025-12-15", "2025-12-16"], ["10:00"]), h(["2025-12-15", "2025-12-16"], ["10:00", "11:00", "12:00"])))
      .toEqual(["ha añadido las franjas de las 11:00 y 12:00"]);
    expect(describeChanges(h(["2025-12-15"], ["10:00", "11:00"]), h(["2025-12-15"], ["11:00"])))
      .toEqual(["ha quitado la franja de las 10:00"]);
  });

  it("las horas de un día nuevo van con el día, no se avisan aparte", () => {
    const h = (slots: string[]): PollData => ({ ...days(), type: "hours", slots, hours: ["10:00"], hourStep: 60, options: undefined });
    expect(describeChanges(h(["2025-12-15"]), h(["2025-12-15", "2025-12-16"])))
      .toEqual(["ha añadido el martes 16 de diciembre"]);
  });

  it("horas sueltas: se nombran con su día", () => {
    const h = (hoursByDay: Record<string, string[]>): PollData => ({
      ...days(), type: "hours", slots: Object.keys(hoursByDay), hours: [], hourStep: 0, hourList: true, hoursByDay, options: undefined,
    });
    expect(describeChanges(h({ "2025-12-15": ["10:00"] }), h({ "2025-12-15": ["10:00", "18:30"] })))
      .toEqual(["ha añadido la hora lun 15 dic 18:30"]);
    expect(describeChanges(h({ "2025-12-15": ["10:00", "11:00", "12:00"] }), h({ "2025-12-15": ["12:00"] })))
      .toEqual(["ha quitado 2 horas: lun 15 dic 10:00 y lun 15 dic 11:00"]);
  });

  it("ningún aviso pasa del largo máximo de un mensaje", () => {
    const [t] = describeChanges(days(), days({ title: "x".repeat(MAX_CHAT) }));
    expect(t).toHaveLength(MAX_CHAT);
    expect(t.endsWith("…")).toBe(true);
  });
});
