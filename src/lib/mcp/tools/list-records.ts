import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_environmental_records",
  title: "List environmental records",
  description: "List the environmental impact records of one project owned by the signed-in user, including amount, unit, SDG codes, verification status and minted tokens.",
  inputSchema: {
    project_id: z.string().uuid().describe("Project id returned by list_projects."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("environmental_records")
      .select("id, amount, unit, recorded_at, sdg_codes, verified, verified_at, tokens_minted, notes")
      .eq("project_id", project_id)
      .order("recorded_at", { ascending: false })
      .limit(200);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { records: data ?? [] },
    };
  },
});
