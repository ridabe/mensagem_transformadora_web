# Estrutura de Banco de Dados — Mensagem Transformadora Web

Este documento descreve a estrutura atual do banco de dados do projeto, com as tabelas usadas pela aplicação, campos principais e relacionamentos.

## Visão geral

O sistema usa as seguintes entidades principais:

- `profiles` — perfis de usuários do Supabase Auth dentro do sistema
- `churches` — igrejas
- `subscriptions` — planos e assinaturas de líderes/igrejas
- `plans` — catálogo de planos disponíveis
- `pre_sermons` — pré-sermões criados pelos líderes
- `published_sermons` — mensagens/sermões publicados na web
- `publication_events` — histórico de eventos de publicação
- `payment_events` — eventos de pagamento recebidos por webhook

## Tabelas e campos principais

### `profiles`
Campos principais:
- `id` UUID PK
- `auth_user_id` UUID único e não nulo (Supabase Auth user ID)
- `name` text não nulo
- `email` text não nulo
- `role` text não nulo (`admin` ou `leader`)
- `church_id` UUID nulo
- `status` text não nulo (`active`, `blocked`, `pending`)
- `created_at`, `updated_at`

Observações:
- Trigger `mt_set_updated_at()` atualiza `updated_at` em cada update
- RLS habilitado com políticas para `authenticated`

### `churches`
Campos principais:
- `id` UUID PK
- `name` text não nulo
- `city` text
- `state` text
- `status` text não nulo (`active`, `inactive`)
- `created_at`, `updated_at`

Observações:
- RLS permite `select` a `anon` e `authenticated` quando `status = 'active'`

### `subscriptions`
Campos principais:
- `id` UUID PK
- `leader_id` UUID (pessoa que contratou o plano)
- `provider` text
- `plan` text
- `status` text
- `current_period_start`, `current_period_end`
- `owner_type` text (`leader` ou `church`)
- `owner_id` UUID
- `church_id` UUID opcional
- `provider_subscription_id`, `provider_customer_id`, `provider_checkout_id`, `provider_product_id`
- `trial_ends_at`, `cancelled_at`, `last_payment_at`
- `metadata` jsonb
- `created_at`, `updated_at`

Regras e constraints:
- `plan` valida valores como `free`, `basic`, `pro`, `church`, `leader_pro_monthly`, `church_monthly`, `plano_basico`, `plano_pro`
- `status` valida valores como `free`, `pending`, `active`, `cancelled`, `expired`, `trialing`, `past_due`, `unpaid`, `incomplete`, `failed`
- Trigger `mt_subscriptions_before_write()` normaliza `owner_type`, `owner_id`, `leader_id` e `provider`
- RLS com políticas para `authenticated`

### `plans`
Campos principais:
- `id` UUID PK
- `code` text único não nulo
- `name` text não nulo
- `description` text
- `price_in_cents` integer não nulo
- `currency` text não nulo (`BRL`)
- `billing_cycle` text não nulo
- `monthly_pre_sermon_limit` integer
- `max_leaders` integer
- `is_active` boolean não nulo
- `created_at`, `updated_at`

Observações:
- RLS permite `select` ativo para `anon` e `authenticated`

### `pre_sermons`
Campos principais:
- `id` UUID PK
- `leader_id` UUID não nulo
- `church_id` UUID
- `share_code` text único não nulo
- `title` text não nulo
- `main_verse` text não nulo
- `secondary_verses` jsonb
- `notes` text
- `status` text não nulo (`draft`, `active`, `archived`)
- `created_at`, `updated_at`

Observações:
- Trigger `mt_pre_sermons_before_write()` gera automaticamente `share_code` e impede alteração de `share_code` e `leader_id` no update
- RLS com políticas para `authenticated` permitindo apenas acesso e alteração quando `leader_id = auth.uid()`

### `published_sermons`
Campos principais obtidos do banco e usados por API e front-end:
- `id` UUID PK
- `user_id` UUID do perfil que publicou
- `local_sermon_id` text ou null
- `user_name` text
- `preacher_name` text
- `church_name` text
- `sermon_date` date
- `sermon_time` text ou null
- `sermon_title` text
- `slug` text
- `main_verse` text
- `secondary_verses` array text
- `introduction` text ou null
- `key_points` jsonb
- `highlighted_phrases` array text
- `personal_observations` text ou null
- `practical_applications` text ou null
- `conclusion` text ou null
- `final_summary` text ou null
- `visibility` text (`public` ou `private`)
- `status` text (`published`, `draft`, `unpublished`, `archived`)
- `source` text (`android_app`, `web_admin`, `import`)
- `views_count` integer
- `published_at` timestamp ou null
- `created_at`, `updated_at`

Observações:
- A tabela não aparece explicitamente nas migrações presentes no repositório, mas existe no banco e é usada intensamente pelo app
- `published_sermons` é a entidade de conteúdo público do site

### `publication_events`
Campos principais:
- `id` UUID PK
- `sermon_id` UUID
- `user_id` UUID
- `event_type` text
- `old_status` text ou null
- `new_status` text ou null
- `old_visibility` text ou null
- `new_visibility` text ou null
- `metadata` jsonb
- `created_at` timestamp

Observações:
- Usado para registrar mudanças de status/visibilidade de publicações, principalmente criação e alteração de mensagens

### `payment_events`
Campos principais:
- `id` UUID PK
- `provider` text não nulo
- `event_type` text não nulo
- `provider_event_id` text
- `provider_subscription_id` text
- `payload` jsonb não nulo
- `processed_at` timestamp
- `created_at` timestamp não nulo

Observações:
- Usado para armazenar webhooks e eventos de pagamento do provedor AbacatePay

## Relacionamentos

- `profiles.church_id` -> `churches.id`
- `subscriptions.leader_id` -> `profiles.auth_user_id`
- `subscriptions.church_id` -> `churches.id`
- `pre_sermons.leader_id` -> `profiles.auth_user_id`
- `pre_sermons.church_id` -> `churches.id`
- `subscriptions.owner_type` / `subscriptions.owner_id` é uma relação polimórfica que suporta `leader` ou `church`, mas não é feita por FK no banco.
- `publication_events.sermon_id` referencia `published_sermons.id` semanticamente
- `publication_events.user_id` referencia `profiles.auth_user_id` semanticamente

## Observações gerais

- Os dados de usuários/sessão dependem do Supabase Auth e de `profiles.auth_user_id`.
- A publicação pública do conteúdo é controlada por `published_sermons.visibility = 'public'` e `status = 'published'`.
- O fluxo de assinatura combina `subscriptions`, `plans` e `payment_events` para permitir planos gratuitos e pagos.

## Nota sobre `.env`

O arquivo `.env` foi removido do índice Git e, como `/.env*` está no `.gitignore`, ele não será mais enviado ao repositório.
