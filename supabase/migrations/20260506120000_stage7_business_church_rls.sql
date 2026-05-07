-- Stage 7: Ajuste de RLS para church_admin em igrejas Business

-- profiles: permitir acesso próprio e estender para church_admin Business e admin global
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS profiles_select_church_admin ON public.profiles;
CREATE POLICY profiles_select_church_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles admin
    JOIN public.churches c ON c.id = admin.church_id
    WHERE admin.auth_user_id = auth.uid()
      AND admin.role = 'church_admin'
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
      AND admin.church_id = church_id
  )
);

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth.uid() = auth_user_id
  AND role IN ('leader', 'church_admin')
);

-- pre_sermons: permitir leitura por líder próprio, church_admin Business e admin global
DROP POLICY IF EXISTS pre_sermons_select_own ON public.pre_sermons;
CREATE POLICY pre_sermons_select_own
ON public.pre_sermons
FOR SELECT
TO authenticated
USING (leader_id = auth.uid());

DROP POLICY IF EXISTS pre_sermons_select_church_admin ON public.pre_sermons;
CREATE POLICY pre_sermons_select_church_admin
ON public.pre_sermons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.churches c ON c.id = p.church_id
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'church_admin'
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
      AND p.church_id = church_id
  )
);

DROP POLICY IF EXISTS pre_sermons_select_admin ON public.pre_sermons;
CREATE POLICY pre_sermons_select_admin
ON public.pre_sermons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);

-- published_sermons: manter público e estender acesso privado para church_admin Business e admin global
DROP POLICY IF EXISTS published_sermons_select_own ON public.published_sermons;
CREATE POLICY published_sermons_select_own
ON public.published_sermons
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS published_sermons_select_church_admin ON public.published_sermons;
CREATE POLICY published_sermons_select_church_admin
ON public.published_sermons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles admin
    JOIN public.churches c ON c.id = admin.church_id
    JOIN public.profiles member ON member.church_id = admin.church_id
    WHERE admin.auth_user_id = auth.uid()
      AND admin.role = 'church_admin'
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
      AND member.auth_user_id = user_id
  )
);

DROP POLICY IF EXISTS published_sermons_select_admin ON public.published_sermons;
CREATE POLICY published_sermons_select_admin
ON public.published_sermons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);

-- publication_events: permitir acesso próprio, church_admin Business e admin global a eventos relacionados
DROP POLICY IF EXISTS publication_events_select_own ON public.publication_events;
CREATE POLICY publication_events_select_own
ON public.publication_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS publication_events_select_church_admin ON public.publication_events;
CREATE POLICY publication_events_select_church_admin
ON public.publication_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.published_sermons ps
    JOIN public.profiles member ON member.auth_user_id = ps.user_id
    JOIN public.profiles admin ON admin.church_id = member.church_id
    JOIN public.churches c ON c.id = admin.church_id
    WHERE ps.id = sermon_id
      AND admin.auth_user_id = auth.uid()
      AND admin.role = 'church_admin'
      AND c.plan_type = 'business'
      AND c.plan_status = 'active'
      AND c.status = 'active'
  )
);

DROP POLICY IF EXISTS publication_events_select_admin ON public.publication_events;
CREATE POLICY publication_events_select_admin
ON public.publication_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);
