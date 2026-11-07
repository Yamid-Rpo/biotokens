import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateRecoveryCodes, hashRecoveryCode, normalizeRecoveryCode } from "@/lib/mfa-recovery";

// Generates 10 new single-use codes, replacing any previous ones. Requires an aal2 session.
export const generateMyRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context as { userId: string; claims: { aal?: string } };
    if (claims?.aal !== "aal2") throw new Error("Verifica tu código MFA antes de generar códigos de recuperación");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codes = generateRecoveryCodes(10);
    const rows = await Promise.all(codes.map(async (c) => ({ user_id: userId, code_hash: await hashRecoveryCode(userId, c) })));
    await supabaseAdmin.from("mfa_recovery_codes").delete().eq("user_id", userId);
    const { error } = await supabaseAdmin.from("mfa_recovery_codes").insert(rows);
    if (error) throw new Error("No se pudieron guardar los códigos");
    return { codes };
  });

export const getMyRecoveryCodeCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("mfa_recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("used_at", null);
    return { remaining: count ?? 0 };
  });

// Consumes one code and removes the user's MFA factors so they can sign in and re-enroll.
export const redeemRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ code: z.string().trim().min(8).max(20) }).parse(i))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await hashRecoveryCode(userId, normalizeRecoveryCode(data.code));
    const { data: row } = await supabaseAdmin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("code_hash", hash)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (!row) throw new Error("Código de recuperación inválido o ya usado");
    const { data: factors } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
    for (const f of factors?.factors ?? []) {
      await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
    }
    await supabaseAdmin.from("mfa_recovery_codes").delete().eq("user_id", userId);
    console.info("[mfa] recovery code used", { userId });
    return { ok: true };
  });
