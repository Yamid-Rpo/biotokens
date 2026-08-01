import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "impact_summary",
  title: "Impact summary",
  description: "Summarise the signed-in user's total environmental impact: number of projects, verified projects, records and tokens issued, grouped by measurement unit.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, status")
      .eq("owner_id", ctx.getUserId()!);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const ids = (projects ?? []).map((p) => p.id);
    const byUnit: Record<string, number> = {};
    let tokens = 0;
    let records = 0;

    if (ids.length) {
      const { data: recs, error: recError } = await supabase
        .from("environmental_records")
        .select("amount, unit, tokens_minted")
        .in("project_id", ids);
      if (recError) return { content: [{ type: "text", text: recError.message }], isError: true };
      records = recs?.length ?? 0;
      for (const r of recs ?? []) {
        byUnit[r.unit] = (byUnit[r.unit] ?? 0) + Number(r.amount || 0);
        tokens += Number(r.tokens_minted || 0);
      }
    }

    const summary = {
      projects: projects?.length ?? 0,
      verified_projects: (projects ?? []).filter((p) => p.status === "verificado" || p.status === "activo").length,
      records,
      tokens,
      amounts_by_unit: byUnit,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
