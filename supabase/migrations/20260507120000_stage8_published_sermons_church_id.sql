-- Stage 8: Adicionar church_id em published_sermons para identidade institucional Business
-- Coluna nullable para compatibilidade com publicações antigas e usuários sem igreja.

ALTER TABLE public.published_sermons
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.published_sermons.church_id IS
  'Igreja vinculada à publicação (somente Business ativa). Null para publicações pessoais ou anteriores à feature.';
