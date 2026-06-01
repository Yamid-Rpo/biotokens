import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NETWORKS = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
} as const;

export const USDC_ISSUER_MAINNET = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const NetEnum = z.enum(["testnet", "mainnet"]);

export const getStellarBalance = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      publicKey: z.string().regex(/^G[A-Z2-7]{55}$/),
      network: NetEnum.default("testnet"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = `${NETWORKS[data.network]}/accounts/${data.publicKey}`;
    const res = await fetch(url);
    if (res.status === 404) return { exists: false, balances: [] as Array<{ asset: string; balance: string }> };
    if (!res.ok) throw new Error(`Horizon ${res.status}`);
    const json = await res.json() as { balances?: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }> };
    const balances = (json.balances ?? []).map((b) => ({
      asset: b.asset_type === "native" ? "XLM" : (b.asset_code ?? "?"),
      issuer: b.asset_issuer,
      balance: b.balance,
    }));
    return { exists: true, balances };
  });

export const getStellarHistory = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      publicKey: z.string().regex(/^G[A-Z2-7]{55}$/),
      network: NetEnum.default("testnet"),
      limit: z.number().int().min(1).max(50).default(20),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = `${NETWORKS[data.network]}/accounts/${data.publicKey}/payments?order=desc&limit=${data.limit}`;
    const res = await fetch(url);
    if (!res.ok) return { records: [] };
    const json = await res.json() as { _embedded?: { records?: Array<Record<string, unknown>> } };
    return { records: json._embedded?.records ?? [] };
  });

export const saveWalletPublicKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      publicKey: z.string().regex(/^G[A-Z2-7]{55}$/),
      network: NetEnum.default("testnet"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, stellar_public_key: data.publicKey, preferred_network: data.network })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("stellar_public_key, preferred_network")
      .eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { stellar_public_key: null, preferred_network: "testnet" };
  });

export const fundTestnet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ publicKey: z.string().regex(/^G[A-Z2-7]{55}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`https://friendbot.stellar.org?addr=${data.publicKey}`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Friendbot: ${t.slice(0, 200)}`);
    }
    return { ok: true };
  });
