-- Stage 16: override individual de acesso à geração de sermão por IA
-- null = segue regra global, true = liberado individualmente, false = bloqueado individualmente

alter table profiles
  add column if not exists ai_sermon_enabled boolean default null;
