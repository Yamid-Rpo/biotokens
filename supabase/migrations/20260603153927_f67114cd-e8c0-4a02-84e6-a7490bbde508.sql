
-- 1) Tighten profiles public exposure: drop the broad policy that exposed sensitive columns to anon
DROP POLICY IF EXISTS profiles_public_read_active_owners ON public.profiles;

-- Create a safe public view exposing only non-sensitive columns of owners with active/verified projects
CREATE OR REPLACE VIEW public.public_project_owners
WITH (security_invoker = true) AS
SELECT p.id, p.full_name, p.organization, p.kind
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.projects pr
  WHERE pr.owner_id = p.id
    AND pr.status IN ('verificado'::project_status, 'activo'::project_status)
);

-- Re-add a column-safe public read policy used by the view (security_invoker view evaluates RLS as caller)
CREATE POLICY profiles_public_owner_basic_read
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.owner_id = profiles.id
      AND pr.status IN ('verificado'::project_status, 'activo'::project_status)
  )
);
-- Note: column-level restriction is enforced by only granting SELECT on the safe view to anon.
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.public_project_owners TO anon, authenticated;

-- Actually drop the just-created broad policy since anon has no table grant; keep only authenticated self read.
DROP POLICY IF EXISTS profiles_public_owner_basic_read ON public.profiles;

-- 2) Prevent privilege escalation via signup metadata: force safe default roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  requested text;
  safe_role public.app_role;
  safe_kind public.user_kind;
BEGIN
  requested := COALESCE(NEW.raw_user_meta_data->>'kind', 'persona');
  -- Only allow self-assignment of non-privileged roles
  IF requested IN ('company', 'persona') THEN
    safe_role := requested::public.app_role;
    safe_kind := requested::public.user_kind;
  ELSE
    safe_role := 'persona'::public.app_role;
    safe_kind := 'persona'::public.user_kind;
  END IF;

  INSERT INTO public.profiles (id, full_name, kind)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), safe_kind);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, safe_role);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- 3) Revoke anon execute on has_role (authenticated still needs it for RLS)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
