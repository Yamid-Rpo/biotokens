GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Tighten profiles public read exposure
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_public_read_active_owners ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.owner_id = profiles.id
      AND p.status IN ('verificado','activo')
  ));