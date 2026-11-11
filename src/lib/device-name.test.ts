import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDeviceName } from "./sectors.ts";
test("clean energy device name includes sector, function and unit", () => {
  const n = buildDeviceName("energia_limpia", "corriente eléctrica", "KWh", new Date(2026, 10, 11, 10, 42));
  assert.equal(n, "ENE-ESP32 · Energía limpia · corriente eléctrica (KWh) · 261111-1042");
});
