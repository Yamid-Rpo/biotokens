// Public ingestion endpoint for ESP32 (and compatible) devices.
// Auth: X-Device-Id + X-Api-Key headers. The device API key is verified
// against its stored SHA-256 hash before any write happens.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hashDeviceApiKey } from "@/lib/iot-keys.server";

const ReadingSchema = z.object({
  metric: z.string().trim().min(1).max(60),
  value: z.number().finite(),
  unit: z.string().trim().max(20).optional(),
  recorded_at: z.string().datetime({ offset: true }).optional(),
});

const PayloadSchema = z.union([ReadingSchema, z.array(ReadingSchema).min(1).max(100)]);

export const Route = createFileRoute("/api/public/iot-readings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deviceId = request.headers.get("x-device-id");
        const apiKey = request.headers.get("x-api-key");
        if (!deviceId || !apiKey) {
          return Response.json({ error: "Missing X-Device-Id or X-Api-Key" }, { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        // Privileged client used ONLY after the device credential is verified.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const apiKeyHash = await hashDeviceApiKey(apiKey);
        const { data: device, error: devErr } = await (supabaseAdmin as any)
          .from("iot_devices")
          .select("id, project_id, api_key_hash")
          .eq("id", deviceId)
          .maybeSingle();
        if (devErr || !device || device.api_key_hash !== apiKeyHash) {
          return Response.json({ error: "Invalid device credentials" }, { status: 401 });
        }

        const readings = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
        const rows = readings.map((r) => ({
          device_id: device.id,
          project_id: device.project_id,
          metric: r.metric,
          value: r.value,
          unit: r.unit ?? null,
          recorded_at: r.recorded_at ?? new Date().toISOString(),
        }));
        const { error: insErr } = await (supabaseAdmin as any).from("iot_readings").insert(rows);
        if (insErr) {
          return Response.json({ error: "Failed to store readings" }, { status: 500 });
        }

        await (supabaseAdmin as any)
          .from("iot_devices")
          .update({ status: "online", last_seen_at: new Date().toISOString() })
          .eq("id", device.id);

        return Response.json({ ok: true, inserted: rows.length });
      },
    },
  },
});
