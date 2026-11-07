import { describe, it, expect } from "vitest";
import { generateRecoveryCodes, hashRecoveryCode } from "./mfa-recovery";

describe("mfa recovery codes", () => {
  it("generates 10 unique codes", () => {
    const c = generateRecoveryCodes(10);
    expect(new Set(c).size).toBe(10);
    expect(c[0]).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });
  it("hash ignores case and dashes", async () => {
    expect(await hashRecoveryCode("u", "abcde-fghjk")).toBe(await hashRecoveryCode("u", "ABCDEFGHJK"));
  });
  it("hash is user-scoped", async () => {
    expect(await hashRecoveryCode("u1", "ABCDE-FGHJK")).not.toBe(await hashRecoveryCode("u2", "ABCDE-FGHJK"));
  });
});
