import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const SECTORS = [
  "forestal", "agricola", "energia_limpia", "movilidad_electrica",
  "recuperacion_agua", "transformacion_residuos", "captura_co2",
] as const;

const UNITS = [
  "m2_reforestado", "m2_agricola", "kwh_renovable", "kg_co2_reducido",
  "l_agua_recuperada", "kg_residuos_transformados",
] as const;

export default defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a new environmental project owned by the signed-in Bio Tokens user. Projects start as drafts (borrador).",
  inputSchema: {
    name: z.string().trim().min(2).max(120).describe("Project name."),
    sector: z.enum(SECTORS).describe("Project sector."),
    unit: z.enum(UNITS).describe("Measurement unit used to issue green tokens."),
    description: z.string().trim().max(2000).optional().describe("Optional project description."),
    country: z.string().trim().max(80).optional().describe("Optional country."),
    location: z.string().trim().max(160).optional().describe("Optional department / city."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...input, owner_id: ctx.getUserId()! })
      .select("id, name, sector, unit, status")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created project "${data.name}" (${data.id}) with status ${data.status}.` }],
      structuredContent: { project: data },
    };
  },
});
