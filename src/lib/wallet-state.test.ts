import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectedWalletKey, walletConnectionSchema } from "./wallet-state";

describe("wallet connection", () => {
  it("disconnects using null, not a fictitious address", () => {
    assert.equal(walletConnectionSchema.parse({ publicKey: null }).publicKey, null);
    assert.equal(connectedWalletKey(null), null);
  });
  it("does not report the old disconnect placeholder as connected", () => {
    const placeholder = "G" + "A".repeat(55);
    assert.equal(connectedWalletKey(placeholder), null);
    assert.equal(walletConnectionSchema.safeParse({ publicKey: placeholder }).success, false);
  });
  it("preserves a connected Stellar public address and selected network", () => {
    const key = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
    assert.equal(connectedWalletKey(key), key);
    assert.deepEqual(walletConnectionSchema.parse({ publicKey: key, network: "mainnet" }), { publicKey: key, network: "mainnet" });
  });
});