-- Etapa 5: Tabela para convites de preleitores (opcional para futuras implementações)

CREATE TABLE IF NOT EXISTS public.church_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  ministry_title TEXT,
  role TEXT NOT NULL DEFAULT 'leader',
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_church_invitations_role
    CHECK (role IN ('leader', 'church_admin')),

  CONSTRAINT chk_church_invitations_status
    CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_church_invitations_church_id
ON public.church_invitations(church_id);

CREATE INDEX IF NOT EXISTS idx_church_invitations_email
ON public.church_invitations(email);

CREATE INDEX IF NOT EXISTS idx_church_invitations_token
ON public.church_invitations(token);

-- RLS para church_invitations
ALTER TABLE public.church_invitations ENABLE ROW LEVEL SECURITY;

-- Política: church_admin pode ver convites da própria igreja
CREATE POLICY "church_admin_can_view_own_church_invitations" ON public.church_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role = 'church_admin'
        AND profiles.church_id = church_invitations.church_id
    )
  );

-- Política: church_admin pode inserir convites para própria igreja
CREATE POLICY "church_admin_can_insert_own_church_invitations" ON public.church_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role = 'church_admin'
        AND profiles.church_id = church_invitations.church_id
    )
    AND invited_by = auth.uid()
  );

-- Política: church_admin pode atualizar convites da própria igreja
CREATE POLICY "church_admin_can_update_own_church_invitations" ON public.church_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role = 'church_admin'
        AND profiles.church_id = church_invitations.church_id
    )
  );

-- Trigger para updated_at
CREATE TRIGGER mt_church_invitations_set_updated_at
  BEFORE UPDATE ON public.church_invitations
  FOR EACH ROW EXECUTE FUNCTION public.mt_set_updated_at();