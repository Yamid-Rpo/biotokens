import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectVarialWallet } from "./varial-wallet";

const address = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const api = {
  isConnected: async () => ({ isConnected: true }),
  requestAccess: async () => ({ address }),
  getNetwork: async () => ({ network: "TESTNET", networkPassphrase: "Test SDF Network ; September 2015" }),
};

describe("Varial wallet connection", () => {
  it("imports only the authorized public address on Testnet", async () => {
    assert.deepEqual(await connectVarialWallet("testnet", api), { publicKey: address, network: "testnet" });
  });
  it("accepts Mainnet only with its exact passphrase", async () => {
    assert.deepEqual(await connectVarialWallet("mainnet", { ...api, getNetwork: async () => ({ network: "PUBLIC", networkPassphrase: "Public Global Stellar Network ; September 2015" }) }), { publicKey: address, network: "mainnet" });
  });
  it("does not connect without the extension", async () => {
    let requested = false;
    await assert.rejects(connectVarialWallet("testnet", { ...api, isConnected: async () => ({ isConnected: false }), requestAccess: async () => { requested = true; return { address }; } }));
    assert.equal(requested, false);
  });
  it("does not connect after the user declines access", async () => {
    await assert.rejects(connectVarialWallet("testnet", { ...api, requestAccess: async () => ({ address: "" }) }));
  });
  it("rejects a wallet on a different network", async () => {
    await assert.rejects(connectVarialWallet("mainnet", api));
  });
  it("rejects a custom network and an invalid address", async () => {
    await assert.rejects(connectVarialWallet("testnet", { ...api, getNetwork: async () => ({ network: "CUSTOM", networkPassphrase: "custom" }) }));
    await assert.rejects(connectVarialWallet("testnet", { ...api, requestAccess: async () => ({ address: "not-a-wallet" }) }));
  });
});