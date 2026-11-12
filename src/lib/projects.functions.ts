import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SectorEnum = z.enum([
  "forestal","agricola","energia_limpia","movilidad_electrica",
  "recuperacion_agua","transformacion_residuos","captura_co2",
]);
const UnitEnum = z.enum([
  "m2_reforestado","m2_agricola","kwh_renovable","kg_co2_reducido",
  "l_agua_recuperada","kg_residuos_transformados",
]);

export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(2000).optional(),
      sector: SectorEnum,
      unit: UnitEnum,
      country: z.string().trim().max(80).optional(),
      location: z.string().trim().max(160).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("projects")
      .insert({ ...data, owner_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { project: row };
  });

// Public detail endpoint: uses an RLS-scoped client. Anonymous visitors only
// see verified/active projects and verified records; owners, admins and
// verifiers see their own/private data through their own session token.
export const getProject = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createRlsClient } = await import("@/lib/supabase-rls.server");
    const db = createRlsClient();
    const { data: project, error } = await db
      .from("projects").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) return { project: null, records: [] };
    const { data: records } = await db
      .from("environmental_records").select("*").eq("project_id", data.id).order("recorded_at", { ascending: false });
    return { project, records: records ?? [] };
  });

// Public catalog: RLS-scoped client + explicit public status filter for
// anonymous callers. Signed-in users additionally see their own projects.
export const listPublicProjects = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createRlsClient } = await import("@/lib/supabase-rls.server");
    const db = createRlsClient();
    const { data, error } = await db
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });


export const addRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      project_id: z.string().uuid(),
      amount: z.number().positive().max(1e12),
      unit: UnitEnum,
      evidence_url: z.string().url().max(500).optional(),
      notes: z.string().trim().max(1000).optional(),
      sdg_codes: z.array(z.number().int().min(1).max(17)).max(7).default([]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: proj } = await supabase
      .from("projects").select("id, owner_id").eq("id", data.project_id).single();
    if (!proj || proj.owner_id !== userId) throw new Error("Not allowed");
    const { data: row, error } = await supabase
      .from("environmental_records").insert(data).select().single();
    if (error) throw new Error(error.message);
    return { record: row };
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: projects } = await supabase.from("projects").select("id, status").eq("owner_id", userId);
    const ids = (projects ?? []).map((p) => p.id);
    let totalTokens = 0;
    let totalRecords = 0;
    if (ids.length) {
      const { data: recs } = await supabase
        .from("environmental_records")
        .select("amount, tokens_minted")
        .in("project_id", ids);
      totalRecords = recs?.length ?? 0;
      totalTokens = (recs ?? []).reduce((s, r) => s + Number(r.tokens_minted || 0), 0);
    }
    return {
      projects: projects?.length ?? 0,
      verified: projects?.filter((p) => p.status === "verificado" || p.status === "activo").length ?? 0,
      records: totalRecords,
      tokens: totalTokens,
    };
  });

export const updateProjectInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      details: z.record(z.string().max(60), z.string().max(500)),
      current_info: z.record(z.string().max(60), z.string().max(500)),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("projects")
      .update({ details: data.details, current_info: data.current_info })
      .eq("id", data.id).eq("owner_id", userId)
      .select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not allowed");
    return { ok: true };
  });
