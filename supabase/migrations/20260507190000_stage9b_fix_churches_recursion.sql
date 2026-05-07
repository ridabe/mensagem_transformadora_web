-- Stage 9b: Eliminar TODAS as cadeias de recursão entre policies
--
-- Ciclo detectado após stage9:
--   pre_sermons → churches (RLS) → churches_select_own → profiles (RLS)
--   → profiles_select_church_admin → churches (RLS) → ∞
--
-- Regra geral: policies NUNCA devem consultar tabelas com RLS diretamente.
-- Toda consulta cross-table deve usar funções SECURITY DEFINER.

-- ─── Helpers SECURITY DEFINER (bypass RLS total, sem recursão) ──────────────

CREATE OR REPLACE FUNCTION public.mt_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mt_auth_church_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT church_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Verifica se o usuário atual é church_admin de uma igreja Business ativa
CREATE OR REPLACE FUNCTION public.mt_auth_is_business_church_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.churches c ON c.id = p.church_id
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'church_admin'
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
  );
$$;

-- Retorna church_id de qualquer usuário (para policies de published_sermons/events)
CREATE OR REPLACE FUNCTION public.mt_get_user_church_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT church_id FROM public.profiles WHERE auth_user_id = p_user_id LIMIT 1;
$$;

-- ─── churches ────────────────────────────────────────────────────────────────
-- churches_select_own consultava profiles via RLS → ciclo com profiles_select_church_admin

DROP POLICY IF EXISTS churches_select_own ON public.churches;
CREATE POLICY churches_select_own
ON public.churches
FOR SELECT
TO authenticated
USING (id = public.mt_auth_church_id());

-- ─── profiles ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (public.mt_auth_role() = 'admin');

DROP POLICY IF EXISTS profiles_select_church_admin ON public.profiles;
CREATE POLICY profiles_select_church_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.mt_auth_is_business_church_admin()
  AND public.mt_auth_church_id() = church_id
);

-- ─── pre_sermons ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS pre_sermons_select_admin ON public.pre_sermons;
CREATE POLICY pre_sermons_select_admin
ON public.pre_sermons
FOR SELECT
TO authenticated
USING (public.mt_auth_role() = 'admin');

DROP POLICY IF EXISTS pre_sermons_select_church_admin ON public.pre_sermons;
CREATE POLICY pre_sermons_select_church_admin
ON public.pre_sermons
FOR SELECT
TO authenticated
USING (
  public.mt_auth_is_business_church_admin()
  AND public.mt_auth_church_id() = church_id
);

-- ─── published_sermons ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS published_sermons_select_admin ON public.published_sermons;
CREATE POLICY published_sermons_select_admin
ON public.published_sermons
FOR SELECT
TO authenticated
USING (public.mt_auth_role() = 'admin');

DROP POLICY IF EXISTS published_sermons_select_church_admin ON public.published_sermons;
CREATE POLICY published_sermons_select_church_admin
ON public.published_sermons
FOR SELECT
TO authenticated
USING (
  public.mt_auth_is_business_church_admin()
  AND public.mt_get_user_church_id(user_id) = public.mt_auth_church_id()
);

-- ─── publication_events ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS publication_events_select_admin ON public.publication_events;
CREATE POLICY publication_events_select_admin
ON public.publication_events
FOR SELECT
TO authenticated
USING (public.mt_auth_role() = 'admin');

DROP POLICY IF EXISTS publication_events_select_church_admin ON public.publication_events;
CREATE POLICY publication_events_select_church_admin
ON public.publication_events
FOR SELECT
TO authenticated
USING (
  public.mt_auth_is_business_church_admin()
  AND EXISTS (
    SELECT 1 FROM public.published_sermons ps
    WHERE ps.id = sermon_id
      AND public.mt_get_user_church_id(ps.user_id) = public.mt_auth_church_id()
  )
);
