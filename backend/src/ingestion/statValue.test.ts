import { test } from "node:test";
import assert from "node:assert/strict";
import { pickStatValue } from "./statValue.js";

test("pickStatValue: parsea porcentajes string ('54%') a número", () => {
  assert.equal(pickStatValue([{ type: "Ball Possession", value: "54%" }], "Ball Possession"), 54);
});

test("pickStatValue: deja pasar números tal cual", () => {
  assert.equal(pickStatValue([{ type: "Corner Kicks", value: 6 }], "Corner Kicks"), 6);
});

test("pickStatValue: null cuando el proveedor no reporta esa estadística", () => {
  assert.equal(pickStatValue([{ type: "Corner Kicks", value: 6 }], "Red Cards"), null);
});

test("pickStatValue: null (no NaN) si el proveedor cambia el formato y no es parseable", () => {
  // Regresión: la versión anterior devolvía `Number("abc%") || null`, que
  // sí caía en null porque NaN es falsy — pero era frágil ante 0 legítimo
  // (Number("0%") || null también daba null, perdiendo un 0 real).
  assert.equal(pickStatValue([{ type: "Ball Possession", value: "abc%" }], "Ball Possession"), null);
});

test("pickStatValue: un 0% legítimo no se confunde con 'sin dato'", () => {
  assert.equal(pickStatValue([{ type: "Ball Possession", value: "0%" }], "Ball Possession"), 0);
});
