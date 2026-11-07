import { z } from "zod";

const LEGACY_DISCONNECTED_KEY = "G" + "A".repeat(55);

export function connectedWalletKey(key: string | null | undefined): string | null {
  return key && key !== LEGACY_DISCONNECTED_KEY ? key : null;
}

export const walletConnectionSchema = z.object({
  publicKey: z.string().regex(/^G[A-Z2-7]{55}$/)
    .refine((key) => key !== LEGACY_DISCONNECTED_KEY, "Dirección Stellar inválida")
    .nullable(),
  network: z.enum(["testnet", "mainnet"]).default("testnet"),
});