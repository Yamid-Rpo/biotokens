import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const UNITS = [
  "m2_reforestado", "m2_agricola", "kwh_renovable", "kg_co2_reducido",
  "l_agua_recuperada", "kg_residuos_transformados",
] as const;

export default defineTool({
  name: "add_environmental_record",
  title: "Add environmental record",
  description: "Register a new environmental impact record for a project owned by the signed-in user. Records start unverified until a verifier approves them.",
  inputSchema: {
    project_id: z.string().uuid().describe("Project id returned by list_projects."),
    amount: z.number().positive().describe("Measured amount in the record unit."),
    unit: z.enum(UNITS).describe("Unit of the measured amount."),
    sdg_codes: z.array(z.number().int()).optional().describe("UN SDG codes: 2, 6, 7, 11, 12, 13 or 15."),
    evidence_url: z.string().url().optional().describe("Optional URL with supporting evidence."),
    notes: z.string().trim().max(1000).optional().describe("Optional notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ project_id, amount, unit, sdg_codes, evidence_url, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const codes = (sdg_codes ?? []).filter((c) => [2, 6, 7, 11, 12, 13, 15].includes(c));
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("environmental_records")
      .insert({ project_id, amount, unit, sdg_codes: codes, evidence_url, notes })
      .select("id, amount, unit, verified, recorded_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Recorded ${data.amount} ${data.unit} (id ${data.id}), pending verification.` }],
      structuredContent: { record: data },
    };
  },
});
