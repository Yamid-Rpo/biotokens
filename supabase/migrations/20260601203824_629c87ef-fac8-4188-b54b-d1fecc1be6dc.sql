
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'verifier', 'company', 'person');
CREATE TYPE public.project_sector AS ENUM ('forestal','agricola','energia_limpia','movilidad_electrica','recuperacion_agua','transformacion_residuos','captura_co2');
CREATE TYPE public.project_status AS ENUM ('borrador','en_revision','verificado','activo','rechazado');
CREATE TYPE public.record_unit AS ENUM ('m2_reforestado','m2_agricola','kwh_renovable','kg_co2_reducido','l_agua_recuperada','kg_residuos_transformados');
CREATE TYPE public.user_kind AS ENUM ('empresa','persona');
CREATE TYPE public.tx_type AS ENUM ('mint','send','receive','swap','bridge');
CREATE TYPE public.stellar_network AS ENUM ('testnet','mainnet');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  organization TEXT,
  kind public.user_kind NOT NULL DEFAULT 'persona',
  language TEXT NOT NULL DEFAULT 'es',
  theme TEXT NOT NULL DEFAULT 'light',
  stellar_public_key TEXT,
  preferred_network public.stellar_network NOT NULL DEFAULT 'testnet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, kind)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE((NEW.raw_user_meta_data->>'kind')::public.user_kind, 'persona'));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'kind')::text, 'persona')::public.app_role);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sector public.project_sector NOT NULL,
  unit public.record_unit NOT NULL,
  country TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status public.project_status NOT NULL DEFAULT 'borrador',
  cover_url TEXT,
  total_tokens NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_public_read_active" ON public.projects FOR SELECT USING (status IN ('verificado','activo'));
CREATE POLICY "projects_owner_read" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "projects_admin_read" ON public.projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'verifier'));
CREATE POLICY "projects_owner_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "projects_owner_update" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "projects_admin_update" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'verifier'));
CREATE POLICY "projects_owner_delete" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- environmental_records
CREATE TABLE public.environmental_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  unit public.record_unit NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence_url TEXT,
  notes TEXT,
  sdg_codes INT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  tokens_minted NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.environmental_records TO authenticated;
GRANT SELECT ON public.environmental_records TO anon;
GRANT ALL ON public.environmental_records TO service_role;
ALTER TABLE public.environmental_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records_public_read_verified" ON public.environmental_records FOR SELECT USING (verified = true);
CREATE POLICY "records_owner_read" ON public.environmental_records FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);
CREATE POLICY "records_admin_read" ON public.environmental_records FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'verifier')
);
CREATE POLICY "records_owner_insert" ON public.environmental_records FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);
CREATE POLICY "records_verifier_update" ON public.environmental_records FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'verifier')
);
CREATE POLICY "records_owner_delete" ON public.environmental_records FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- wallet_transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network public.stellar_network NOT NULL DEFAULT 'testnet',
  tx_type public.tx_type NOT NULL,
  asset_code TEXT NOT NULL,
  asset_issuer TEXT,
  amount NUMERIC NOT NULL,
  counterparty TEXT,
  stellar_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_self_read" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tx_self_insert" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
