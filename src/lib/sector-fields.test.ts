import { test } from "node:test";
import assert from "node:assert/strict";
import { SECTOR_FIELDS } from "./sector-fields";

test("energía limpia incluye inversores y red eléctrica", () => {
  assert.ok(SECTOR_FIELDS.energia_limpia.project.some((x) => x.label === "Inversores"));
  assert.ok(SECTOR_FIELDS.energia_limpia.current.some((x) => x.label === "Red eléctrica"));
});
test("movilidad eléctrica pide el VIN", () => {
  assert.ok(SECTOR_FIELDS.movilidad_electrica.project.some((x) => x.key === "vin"));
});
