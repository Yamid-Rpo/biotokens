import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateRecoveryCodes, hashRecoveryCode } from "./mfa-recovery";

describe("mfa recovery codes", () => {
  it("generates 10 unique codes", () => {
    const c = generateRecoveryCodes(10);
    assert.equal(new Set(c).size, 10);
    assert.match(c[0], /^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });
  it("hash ignores case and dashes", async () => {
    assert.equal(await hashRecoveryCode("u", "abcde-fghjk"), await hashRecoveryCode("u", "ABCDEFGHJK"));
  });
  it("hash is user-scoped", async () => {
    assert.notEqual(await hashRecoveryCode("u1", "ABCDE-FGHJK"), await hashRecoveryCode("u2", "ABCDE-FGHJK"));
  });
});
