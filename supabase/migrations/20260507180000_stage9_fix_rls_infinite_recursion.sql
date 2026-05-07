-- Stage 9: Corrigir recursão infinita nas policies de profiles
--
-- Causa: policies que consultam a própria tabela `profiles` (ex: profiles_select_admin)
-- ativam outras policies que também consultam `profiles`, gerando recursão infinita (42P17).
-- Solução: funções SECURITY DEFINER que leem role/church_id sem passar pelo RLS.

-- ─── Helpers SECURITY DEFINER (bypass RLS, sem recursão) ────────────────────

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
  public.mt_auth_role() = 'church_admin'
  AND public.mt_auth_church_id() IS NOT NULL
  AND public.mt_auth_church_id() = church_id
  AND EXISTS (
    SELECT 1 FROM public.churches c
    WHERE c.id = public.mt_auth_church_id()
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
  )
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
  public.mt_auth_role() = 'church_admin'
  AND public.mt_auth_church_id() IS NOT NULL
  AND public.mt_auth_church_id() = church_id
  AND EXISTS (
    SELECT 1 FROM public.churches c
    WHERE c.id = public.mt_auth_church_id()
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
  )
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
  public.mt_auth_role() = 'church_admin'
  AND public.mt_auth_church_id() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles member
    JOIN public.churches c ON c.id = member.church_id
    WHERE member.auth_user_id = user_id
      AND member.church_id = public.mt_auth_church_id()
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
  )
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
  public.mt_auth_role() = 'church_admin'
  AND public.mt_auth_church_id() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.published_sermons ps
    JOIN public.profiles member ON member.auth_user_id = ps.user_id
    JOIN public.churches c ON c.id = member.church_id
    WHERE ps.id = sermon_id
      AND member.church_id = public.mt_auth_church_id()
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
  )
);
