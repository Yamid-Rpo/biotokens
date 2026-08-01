-- 1) has_role: no longer SECURITY DEFINER; runs as caller and only sees own roles via RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Trigger functions must never be callable through the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) user_roles: read-only for signed-in users, no write path at all
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.user_roles FROM authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4) Signup trigger: correct enum mapping, privileged roles can never be self-assigned
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested text;
  safe_role public.app_role;
  safe_kind public.user_kind;
BEGIN
  requested := lower(COALESCE(NEW.raw_user_meta_data->>'kind', 'persona'));

  IF requested IN ('empresa', 'company') THEN
    safe_role := 'company'::public.app_role;
    safe_kind := 'empresa'::public.user_kind;
  ELSE
    safe_role := 'person'::public.app_role;
    safe_kind := 'persona'::public.user_kind;
  END IF;

  INSERT INTO public.profiles (id, full_name, kind)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), safe_kind)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;