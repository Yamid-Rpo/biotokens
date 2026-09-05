DROP VIEW IF EXISTS public.public_project_readings;

-- Aggregated public access: latest reading per metric for verified/active projects only.
-- SECURITY DEFINER with fixed search_path; exposes no raw granular history.
CREATE OR REPLACE FUNCTION public.public_project_readings(_project_id uuid)
RETURNS TABLE (project_id uuid, metric text, value double precision, unit text, recorded_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (r.project_id, r.metric)
    r.project_id, r.metric, r.value, r.unit, r.recorded_at
  FROM public.iot_readings r
  JOIN public.projects p ON p.id = r.project_id
  WHERE r.project_id = _project_id
    AND p.status IN ('verificado', 'activo')
  ORDER BY r.project_id, r.metric, r.recorded_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.public_project_readings(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.public_project_readings(uuid) TO authenticated;