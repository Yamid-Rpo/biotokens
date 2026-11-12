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
        device_id: z.string().uuid().optional(),
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
    // Register once: if the project already has this device (by id, else the
    // latest of the same type), update its data and rotate its key instead.
    let q = (supabase as any).from("iot_devices").select("id").eq("project_id", data.project_id);
    q = data.device_id ? q.eq("id", data.device_id) : q.eq("device_type", data.device_type);
    const { data: existing } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) {
      const { data: device, error } = await (supabase as any)
        .from("iot_devices")
        .update({ name: data.name, api_key_hash })
        .eq("id", existing.id)
        .select(DEVICE_COLS)
        .single();
      if (error) throw new Error(error.message);
      return { device, apiKey, updated: true };
    }
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
    return { device, apiKey, updated: false };
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

// Full reading history (raw) for the project owner/admin. Feeds every tab of
// the verification panel so all views show the same device-generated data.
export const listProjectReadingHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ project_id: z.string().uuid(), limit: z.number().int().min(1).max(2000).default(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: readings, error } = await (context.supabase as any)
      .from("iot_readings")
      .select("id, device_id, metric, value, unit, recorded_at")
      .eq("project_id", data.project_id)
      .order("recorded_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { readings: (readings ?? []) as any[] };
  });
