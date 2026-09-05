import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateDeviceApiKey, hashDeviceApiKey } from "@/lib/iot-keys.server";

// Column list avoids api_key_hash (revoked from authenticated role).
const DEVICE_COLS = "id, project_id, name, device_type, status, last_seen_at, created_at";

export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        project_id: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        device_type: z.string().trim().min(2).max(60).default("esp32"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", data.project_id)
      .single();
    if (!proj || proj.owner_id !== userId) throw new Error("Not allowed");

    const apiKey = generateDeviceApiKey();
    const api_key_hash = await hashDeviceApiKey(apiKey);
    const { data: device, error } = await (supabase as any)
      .from("iot_devices")
      .insert({
        project_id: data.project_id,
        name: data.name,
        device_type: data.device_type,
        api_key_hash,
      })
      .select(DEVICE_COLS)
      .single();
    if (error) throw new Error(error.message);
    // The plain API key is returned once and never stored.
    return { device, apiKey };
  });

export const listDevices = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createRlsClient } = await import("@/lib/supabase-rls.server");
    const db = createRlsClient();
    const { data: devices, error } = await (db as any)
      .from("iot_devices")
      .select(DEVICE_COLS)
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { devices: (devices ?? []) as any[] };
  });

export const revokeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ device_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: device } = await (supabase as any)
      .from("iot_devices")
      .select("id, project_id")
      .eq("id", data.device_id)
      .maybeSingle();
    if (!device) throw new Error("Device not found");
    const { data: proj } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", device.project_id)
      .single();
    if (!proj || proj.owner_id !== userId) throw new Error("Not allowed");
    const { error } = await (supabase as any).from("iot_devices").delete().eq("id", data.device_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Latest readings for a project. Reads the public snapshot table
// (iot_public_readings): only the newest value per metric, never raw granular
// history. RLS: owners/admins always; public only for verified/active projects.
export const listDeviceReadings = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ project_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { createRlsClient } = await import("@/lib/supabase-rls.server");
    const db = createRlsClient();
    const { data: readings, error } = await (db as any)
      .from("iot_public_readings")
      .select("project_id, metric, value, unit, recorded_at")
      .eq("project_id", data.project_id)
      .order("recorded_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { readings: (readings ?? []) as any[] };
  });
