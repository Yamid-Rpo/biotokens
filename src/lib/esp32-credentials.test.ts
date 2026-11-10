import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCredentials, buildMainPy } from "./esp32-flash.ts";

const base = buildMainPy({ ssid: "TU_WIFI", pass: "TU_CLAVE", url: "u", device: "PEGAR_DEVICE_ID", key: "PEGAR_API_KEY", metric: "m", unit: "KWh" });

test("writes the registered device ID and API key into main.py", () => {
  const out = applyCredentials(base, { device: "abc-123", key: "bt_secret", ssid: "Casa", pass: "p$1", adcPin: 2 });
  assert.match(out, /^DEVICE="abc-123"$/m);
  assert.match(out, /^KEY="bt_secret"$/m);
  assert.match(out, /^SSID="Casa"$/m);
  assert.match(out, /^PASS="p\$1"$/m);
  assert.match(out, /machine\.Pin\(2\)/);
  assert.doesNotMatch(out, /PEGAR_/);
});
