-- Etapa 5: Gestão de preleitores para Plano Business
-- Adicionar church_admin ao role de profiles

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'leader', 'church_admin'));