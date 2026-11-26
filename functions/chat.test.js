// Pruebas de chat.js (node --test, sin Firestore): `npm test` en functions/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstUnread } from "./chat.js";

test("firstUnread: sin haber visto nada ni recibido avisos, el primer mensaje avisa", () => {
  assert.equal(firstUnread({}, 100), true);
  assert.equal(firstUnread(undefined, 100), true);
});

test("firstUnread: lo ya visto no avisa", () => {
  assert.equal(firstUnread({ chatSeenAt: 100 }, 100), false);
  assert.equal(firstUnread({ chatSeenAt: 150 }, 100), false);
});

test("firstUnread: tras un aviso sin leer, los siguientes no avisan", () => {
  assert.equal(firstUnread({ chatSeenAt: 50, chatNotifiedAt: 100 }, 200), false);
});

test("firstUnread: después de abrir el chat, el siguiente mensaje vuelve a avisar", () => {
  assert.equal(firstUnread({ chatSeenAt: 120, chatNotifiedAt: 100 }, 200), true);
  assert.equal(firstUnread({ chatSeenAt: 100, chatNotifiedAt: 100 }, 200), true);
});
