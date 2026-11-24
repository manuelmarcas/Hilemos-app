// Pruebas de las funciones puras de plan.js (node --test, sin Firestore): `npm test` en functions/.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY, FREE_OPEN, GRACE, INHERIT_GRACE, addedReasons, betterHeir, closeAtOf, countdownPatch, extrasOf, isOpen,
  nextWhy, openLimit, paidSettings,
} from "./plan.js";

const now = 1_800_000_000_000;

test("isOpen: ni cerrada ni con el plazo pasado", () => {
  assert.equal(isOpen({ closed: false }, now), true);
  assert.equal(isOpen({ closed: true }, now), false);
  assert.equal(isOpen({ closed: false, deadline: now }, now), false);
  assert.equal(isOpen({ closed: false, deadline: now + 1 }, now), true);
});

test("paidSettings: plazo, aprobación, correos, administradores o más de 20 personas", () => {
  assert.equal(paidSettings({}), false);
  assert.equal(paidSettings({ members: 20 }), false);
  assert.equal(paidSettings({ members: 21 }), true);
  assert.equal(paidSettings({ admins: [] }), false);
  assert.equal(paidSettings({ admins: ["a"] }), true);
  assert.equal(paidSettings({ deadline: 1 }), true);
  assert.equal(paidSettings({ approval: true }), true);
  assert.equal(paidSettings({ emailsOnly: true }), true);
});

test("openLimit: 3 sin premium, 50 con premium", () => {
  assert.equal(openLimit(false), FREE_OPEN);
  assert.equal(openLimit(true), 50);
});

test("extrasOf: sobran las últimas en llegar a sus manos (heredada = ownerSince, creada = createdAt)", () => {
  const polls = [
    { id: "a", createdAt: 1 },
    { id: "b", createdAt: 5 },
    { id: "c", createdAt: 2, ownerSince: 9 }, // heredada la última
    { id: "d", createdAt: 3 },
  ];
  assert.deepEqual([...extrasOf(polls, 3)], ["c"]);
  assert.deepEqual([...extrasOf(polls, 2)].sort(), ["b", "c"]);
  assert.equal(extrasOf(polls, 4).size, 0);
});

test("nextWhy: cuentas atrás nuevas, conservadas y quitadas", () => {
  // Hereda sin sitio: 7 días.
  assert.deepEqual(nextWhy({}, { extra: true, paid: false, premium: false, now, extraGrace: INHERIT_GRACE }), { limit: now + 7 * DAY });
  // Sobra sin herencia: 30 días.
  assert.deepEqual(nextWhy({}, { extra: true, paid: false, premium: false, now }), { limit: now + GRACE });
  // Ya corría: la fecha no vuelve a empezar (pasarla entre dos cuentas llenas no la alarga).
  assert.deepEqual(nextWhy({ limit: now + DAY }, { extra: true, paid: false, premium: false, now, extraGrace: INHERIT_GRACE }), { limit: now + DAY });
  // Deja de sobrar: se quita.
  assert.deepEqual(nextWhy({ limit: now + DAY }, { extra: false, paid: false, premium: false, now }), {});
  // Funciones de pago sin premium: 30 días; con premium, nada.
  assert.deepEqual(nextWhy({}, { extra: false, paid: true, premium: false, now }), { premium: now + GRACE });
  assert.deepEqual(nextWhy({ premium: now + DAY }, { extra: false, paid: true, premium: true, now }), {});
  // Las dos a la vez: cada una con su fecha.
  assert.deepEqual(nextWhy({ premium: now + DAY }, { extra: true, paid: true, premium: false, now, extraGrace: INHERIT_GRACE }),
    { limit: now + INHERIT_GRACE, premium: now + DAY });
});

test("closeAtOf: la primera fecha, o 0", () => {
  assert.equal(closeAtOf({}), 0);
  assert.equal(closeAtOf(undefined), 0);
  assert.equal(closeAtOf({ limit: 5, premium: 3 }), 3);
});

test("addedReasons: solo los motivos nuevos", () => {
  assert.deepEqual(addedReasons({ limit: 1 }, { limit: 1, premium: 2 }), ["premium"]);
  assert.deepEqual(addedReasons(undefined, { limit: 1 }), ["limit"]);
  assert.deepEqual(addedReasons({ limit: 1 }, {}), []);
});

test("countdownPatch: nada si no cambia, borra si no queda ninguna, y reinicia el aviso si cambia la fecha", () => {
  assert.equal(countdownPatch({ autoCloseWhy: { limit: 5 }, autoCloseAt: 5 }, { limit: 5 }), null);
  assert.equal(countdownPatch({}, {}), null);
  const cleared = countdownPatch({ autoCloseWhy: { limit: 5 }, autoCloseAt: 5 }, {});
  assert.deepEqual(Object.keys(cleared).sort(), ["autoCloseAt", "autoCloseWarned", "autoCloseWhy"]);
  const set = countdownPatch({}, { limit: 7, premium: 9 });
  assert.equal(set.autoCloseAt, 7);
  assert.deepEqual(set.autoCloseWhy, { limit: 7, premium: 9 });
  assert.ok("autoCloseWarned" in set);
  // Misma fecha de cierre (se añade un motivo posterior): el aviso del día antes no se repite.
  const same = countdownPatch({ autoCloseWhy: { limit: 7 }, autoCloseAt: 7 }, { limit: 7, premium: 9 });
  assert.ok(!("autoCloseWarned" in same));
});

test("betterHeir: administrador con premium, luego con sitio, luego cualquier participante con sitio", async () => {
  const plans = { a1: { fits: true, premium: false }, a2: { fits: true, premium: true }, a3: { fits: false, premium: false },
    p1: { fits: false, premium: false }, p2: { fits: true, premium: false } };
  const room = async uid => plans[uid];
  for (let i = 0; i < 20; i++) assert.equal(await betterHeir({ admins: ["a1", "a2", "a3"], others: ["p1", "p2"] }, room), "a2");
  assert.equal(await betterHeir({ admins: ["a1", "a3"], others: ["p2"] }, room), "a1");
  assert.equal(await betterHeir({ admins: ["a3"], others: ["p1", "p2"] }, room), "p2");
  assert.equal(await betterHeir({ admins: ["a3"], others: ["p1"] }, room), null);
  assert.equal(await betterHeir({ admins: [], others: [] }, room), null);
});
