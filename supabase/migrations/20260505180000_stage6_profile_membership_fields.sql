-- Etapa 6: Metadados de vínculo com igreja (migração de usuários legacy e novas origens)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS church_membership_source TEXT,
  ADD COLUMN IF NOT EXISTS church_membership_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_church_membership_source;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_church_membership_source
  CHECK (
    church_membership_source IS NULL
    OR church_membership_source IN ('legacy', 'invitation', 'admin_global')
  );

UPDATE public.profiles
SET
  church_membership_source = 'legacy',
  church_membership_confirmed_at = COALESCE(church_membership_confirmed_at, now())
WHERE church_id IS NOT NULL
  AND (church_membership_source IS NULL OR church_membership_source = '');

