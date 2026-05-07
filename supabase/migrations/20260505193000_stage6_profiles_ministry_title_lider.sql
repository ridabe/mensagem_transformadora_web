-- Etapa 6: Permitir 'lider' em profiles.ministry_title

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ministry_title_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ministry_title_check
  CHECK (
    ministry_title IS NULL
    OR ministry_title IN ('pastor', 'diacono', 'bispo', 'apostolo', 'missionario', 'pregador', 'lider')
  );

