-- 1) Remove anonymous access to raw iot_readings rows
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'iot_readings' AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.iot_readings', p.policyname);
  END LOOP;
END $$;

REVOKE SELECT ON public.iot_readings FROM anon;

-- 2) Aggregated public view: only the latest value per metric per public project.
-- Runs with view-owner privileges (views are security definer by default in Postgres),
-- so it can read base rows while anon cannot.
CREATE OR REPLACE VIEW public.public_project_readings AS
SELECT DISTINCT ON (r.project_id, r.metric)
  r.project_id,
  r.metric,
  r.value,
  r.unit,
  r.recorded_at
FROM public.iot_readings r
JOIN public.projects p ON p.id = r.project_id
WHERE p.status IN ('verificado', 'activo')
ORDER BY r.project_id, r.metric, r.recorded_at DESC;

GRANT SELECT ON public.public_project_readings TO anon;
GRANT SELECT ON public.public_project_readings TO authenticated;