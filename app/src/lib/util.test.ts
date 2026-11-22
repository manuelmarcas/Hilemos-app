import { describe, expect, it } from "vitest";
import { bem, errMsg, firstGrapheme, safePhoto, slugify, sortedGroups } from "./util";

describe("util", () => {
  it("bem: modificadores verdaderos y mezclas", () => {
    expect(bem("picker__day", { on: true, locked: false })).toBe("picker__day picker__day--on");
    expect(bem("btn", {}, "create-bar__btn", false, null)).toBe("btn create-bar__btn");
  });

  it("safePhoto: solo imágenes en base64 o https", () => {
    expect(safePhoto("https://lh3.googleusercontent.com/a/x")).toBe("https://lh3.googleusercontent.com/a/x");
    expect(safePhoto("data:image/jpeg;base64,AAAA+/==")).toBe("data:image/jpeg;base64,AAAA+/==");
    expect(safePhoto("http://inseguro.com/a.png")).toBe("");
    expect(safePhoto("javascript:alert(1)")).toBe("");
    expect(safePhoto('https://x.com/a.png" onerror="x')).toBe("");
    expect(safePhoto("data:image/svg+xml;base64,AAAA")).toBe("");
    expect(safePhoto(42)).toBe("");
  });

  it("errMsg: mensaje propio o el código", () => {
    expect(errMsg({ code: "not-found" })).toBe("La votación ya no existe.");
    expect(errMsg({ code: "otro/codigo" })).toBe("Error: otro/codigo");
    expect(errMsg(new Error("roto"))).toBe("Error: roto");
  });

  it("firstGrapheme: emojis compuestos enteros", () => {
    expect(firstGrapheme("  Ana")).toBe("A");
    expect(firstGrapheme("👩‍👩‍👧 familia")).toBe("👩‍👩‍👧");
    expect(firstGrapheme(undefined)).toBe("");
  });

  it("slugify", () => {
    expect(slugify("¡Cena de Navidad 2025!")).toBe("cena-de-navidad-2025");
    expect(slugify("Ñandú y café", 6)).toBe("nandu-");
  });

  it("sortedGroups: por nombre, con nombre por defecto", () => {
    expect(sortedGroups({ b: { name: "Zumba" }, a: { name: "Ábaco" }, c: { name: "" } }).map(g => g.name))
      .toEqual(["Ábaco", "Sin nombre", "Zumba"]);
    expect(sortedGroups(null)).toEqual([]);
  });
});
