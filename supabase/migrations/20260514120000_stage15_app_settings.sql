-- Stage 15: app_settings — chave-valor para configurações globais da plataforma

create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Configuração inicial: geração de IA liberada para plano free
insert into app_settings (key, value)
values ('ai_generation_free_enabled', 'true')
on conflict (key) do nothing;

-- Apenas service_role acessa esta tabela
alter table app_settings enable row level security;
-- Nenhuma policy pública: acesso exclusivo via service_role (bypassa RLS)
