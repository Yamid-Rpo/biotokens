import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjectsTool from "./tools/list-projects";
import createProjectTool from "./tools/create-project";
import listRecordsTool from "./tools/list-records";
import addRecordTool from "./tools/add-record";
import impactSummaryTool from "./tools/impact-summary";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged and Vite inlines it at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "biotokens",
  title: "BioTokens",
  version: "0.1.0",
  instructions:
    "Tools for Bio Tokens, a blockchain certification platform for carbon emission reduction. Use `list_projects` to see the signed-in user's environmental projects, `create_project` to register a new one, `list_environmental_records` and `add_environmental_record` to read and register measured impact (m², kWh, kg, L) aligned with the UN SDGs, and `impact_summary` for aggregated totals and issued green tokens.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProjectsTool, createProjectTool, listRecordsTool, addRecordTool, impactSummaryTool],
});
