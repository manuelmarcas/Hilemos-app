import { describe, expect, it } from "vitest";
import * as D from "./dates";

describe("dates", () => {
  it("semana ISO, también en el cambio de año", () => {
    expect(D.isoWeek(D.parseDay("2025-12-15"))).toBe(51);
    expect(D.isoWeek(D.parseDay("2025-12-29"))).toBe(1); // el lunes 29 ya es la semana 1 de 2026
    expect(D.isoWeek(D.parseDay("2027-01-01"))).toBe(53);
  });

  it("días entre dos fechas, en cualquier orden y cruzando meses", () => {
    expect(D.daysBetween("2026-03-02", "2026-02-27")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  });

  it("no se salta ni repite días con el cambio de hora", () => {
    expect(D.daysBetween("2026-03-28", "2026-03-30")).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"]);
    expect(D.daysBetween("2026-10-24", "2026-10-26")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });

  it("franjas que caben enteras en el horario", () => {
    expect(D.hourRange("09:00", "11:00", 45)).toEqual(["09:00", "09:45"]);
    expect(D.hourRange("09:00", "09:30", 60)).toEqual([]);
  });

  it("calendario de un mes: semanas de lunes a domingo", () => {
    const weeks = D.monthWeeks(2025, 11); // diciembre de 2025
    expect(weeks).toHaveLength(5);
    expect(weeks[0].key).toBe("2025-12-01");
    expect(weeks[4].days.map(d => d.key)).toEqual(
      ["2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
    expect(weeks[4].days.filter(d => d.inMonth)).toHaveLength(3);
  });

  it("formatos", () => {
    expect(D.fmtDayLong("2025-12-16")).toBe("martes 16 de diciembre");
    expect(D.fmtDayShort("2025-12-16")).toBe("mar 16 dic");
    expect(D.fmtMonth("2026-01")).toBe("enero 2026");
    expect(D.fmtWeekRange("2025-12-15")).toBe("15–21 dic");
    expect(D.fmtWeekRange("2025-12-29")).toBe("29 dic – 4 ene");
    expect(D.fmtWeek("2025-12-15")).toBe("Semana 51 · 15–21 dic");
  });
});

describe("weekdaysWith (columnas del calendario con algún día votable)", () => {
  it("marca solo los días de la semana que tienen algún día del conjunto ese mes", () => {
    // Noviembre de 2026: el 25 es miércoles, el 26 jueves, el 27 viernes y el 30 lunes.
    const days = new Set(["2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30", "2026-12-01"]);
    expect(D.weekdaysWith(2026, 10, days)).toEqual([true, false, true, true, true, false, false]);
  });
  it("sin días ese mes, ninguna", () => {
    expect(D.weekdaysWith(2026, 10, new Set())).toEqual([false, false, false, false, false, false, false]);
  });
});
