DROP FUNCTION IF EXISTS public.public_project_readings(uuid);

-- Public snapshot: only the latest value per metric per project. Updated by trigger.
CREATE TABLE IF NOT EXISTS public.iot_public_readings (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value double precision NOT NULL,
  unit text,
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (project_id, metric)
);

GRANT SELECT ON public.iot_public_readings TO anon;
GRANT SELECT ON public.iot_public_readings TO authenticated;
GRANT ALL ON public.iot_public_readings TO service_role;

ALTER TABLE public.iot_public_readings ENABLE ROW LEVEL SECURITY;

-- Anonymous users only see snapshots of verified/active public projects.
CREATE POLICY "Public snapshots of public projects"
ON public.iot_public_readings
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.status IN ('verificado', 'activo')
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Trigger keeps only the newest value per metric. Not callable by API roles.
CREATE OR REPLACE FUNCTION public.sync_iot_public_reading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.iot_public_readings (project_id, metric, value, unit, recorded_at)
  VALUES (NEW.project_id, NEW.metric, NEW.value, NEW.unit, NEW.recorded_at)
  ON CONFLICT (project_id, metric)
  DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit, recorded_at = EXCLUDED.recorded_at
  WHERE EXCLUDED.recorded_at >= public.iot_public_readings.recorded_at;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_iot_public_reading() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_iot_public_reading ON public.iot_readings;
CREATE TRIGGER trg_sync_iot_public_reading
AFTER INSERT ON public.iot_readings
FOR EACH ROW EXECUTE FUNCTION public.sync_iot_public_reading();