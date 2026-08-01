// Server-only helper: builds a Supabase client that RESPECTS Row Level Security.
// If the incoming request carries a Bearer token, the client acts as that user;
// otherwise it acts as the anonymous role. Never uses the service role key.
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export function createRlsClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

  let token: string | undefined;
  try {
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const raw = authHeader.slice("Bearer ".length).trim();
      if (raw && raw !== key) token = raw;
    }
  } catch {
    token = undefined;
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
      : {}),
  });
}
