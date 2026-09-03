CREATE TABLE public.iot_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  device_type text NOT NULL DEFAULT 'esp32',
  api_key_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline')),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.iot_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value double precision NOT NULL,
  unit text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX iot_readings_project_idx ON public.iot_readings(project_id, recorded_at DESC);
CREATE INDEX iot_readings_device_idx ON public.iot_readings(device_id, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iot_devices TO authenticated;
GRANT ALL ON public.iot_devices TO service_role;
GRANT SELECT ON public.iot_readings TO authenticated;
GRANT SELECT ON public.iot_readings TO anon;
GRANT ALL ON public.iot_readings TO service_role;

ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their devices" ON public.iot_devices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Admins manage all devices" ON public.iot_devices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners read their readings" ON public.iot_readings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE POLICY "Admins read all readings" ON public.iot_readings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public readings of public projects" ON public.iot_readings
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status IN ('verificado','activo')));

REVOKE SELECT (api_key_hash) ON public.iot_devices FROM anon, authenticated;