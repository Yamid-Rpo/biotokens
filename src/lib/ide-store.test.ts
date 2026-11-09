import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIdeConfig } from "./ide-store.ts";

const main = `SSID="CasaNet"
URL="https://biotokens.lovable.app/api/public/iot-readings"
DEVICE="3F2504E0-4F89-11D3-9A0C-0305E82C3301"
KEY="abc"
METRIC="corriente eléctrica"
UNIT="KWh"
INTERVAL=30
adc=machine.ADC(machine.Pin(2))`;

test("reads device, metric, unit, interval and pin from main.py", () => {
  const c = parseIdeConfig(main);
  assert.equal(c.device, "3f2504e0-4f89-11d3-9a0c-0305e82c3301");
  assert.equal(c.metric, "corriente eléctrica");
  assert.equal(c.unit, "KWh");
  assert.equal(c.interval, 30);
  assert.equal(c.pin, 2);
  assert.equal(c.hasKey, true);
});

test("placeholder device ID is not treated as a real device", () => {
  const c = parseIdeConfig(main.replace(/DEVICE=".*"/, 'DEVICE="PEGAR_DEVICE_ID"').replace(/KEY=".*"/, 'KEY="PEGAR_API_KEY"'));
  assert.equal(c.device, null);
  assert.equal(c.hasKey, false);
});
