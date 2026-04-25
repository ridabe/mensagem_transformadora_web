MDD — Modelagem de Dados
Mensagem Transformadora Web
1. Objetivo

Definir a estrutura de dados da plataforma web Mensagem Transformadora, responsável por receber, armazenar, publicar e gerenciar mensagens/sermões criados originalmente no app Android.

O app Android continua com SQLite local e funcionamento offline. A web armazenará somente mensagens que o usuário decidir publicar manualmente.

2. Banco de Dados
Banco escolhido
Supabase PostgreSQL
Recursos utilizados
PostgreSQL
Supabase Auth
Row Level Security
Triggers
Functions
Indexes
JSONB
UUID
3. Entidades Principais
auth.users
profiles
published_sermons
sermon_view_logs
publication_events
4. Diagrama Conceitual
auth.users
   |
   | 1 : 1
   v
profiles
   |
   | 1 : N
   v
published_sermons
   |
   | 1 : N
   v
sermon_view_logs

published_sermons
   |
   | 1 : N
   v
publication_events
5. Tabela: profiles
Objetivo

Guardar informações complementares do usuário autenticado.

O usuário será criado no Supabase Auth, e a tabela profiles armazenará os dados públicos e administrativos.

Campos
Campo	Tipo	Obrigatório	Descrição
id	uuid	sim	mesmo ID do auth.users
display_name	text	sim	nome público do usuário
email	text	sim	e-mail do usuário
avatar_url	text	não	foto/avatar
ministry_name	text	não	nome do ministério
church_name	text	não	igreja principal
bio	text	não	descrição curta
is_public	boolean	sim	se o perfil pode aparecer publicamente
created_at	timestamptz	sim	criação
updated_at	timestamptz	sim	atualização
SQL
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  ministry_name TEXT,
  church_name TEXT,
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
6. Tabela: published_sermons
Objetivo

Armazenar mensagens publicadas na plataforma web.

Essa tabela representa a versão online da entidade SermonNote do app, mantendo compatibilidade com os campos já existentes como pregador, igreja, versículo base, pontos principais, frases marcantes, conclusão e resumo final.

Campos
Campo	Tipo	Obrigatório	Descrição
id	uuid	sim	ID web
user_id	uuid	sim	dono da publicação
local_sermon_id	text	não	ID local do app
user_name	text	sim	autor da anotação
preacher_name	text	sim	pregador
church_name	text	sim	igreja
sermon_date	date	sim	data da pregação
sermon_time	text	não	horário
sermon_title	text	sim	título
slug	text	sim	URL amigável
main_verse	text	sim	versículo base
secondary_verses	jsonb	sim	lista de versículos
introduction	text	não	introdução
key_points	jsonb	sim	pontos principais
highlighted_phrases	jsonb	sim	frases marcantes
personal_observations	text	não	observações pessoais
practical_applications	text	não	aplicações práticas
conclusion	text	não	conclusão
final_summary	text	não	resumo final
visibility	text	sim	pública ou privada
status	text	sim	estado da publicação
source	text	sim	origem da publicação
views_count	integer	sim	total de visualizações
published_at	timestamptz	não	data de publicação
created_at	timestamptz	sim	criação
updated_at	timestamptz	sim	atualização
SQL
CREATE TABLE IF NOT EXISTS public.published_sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_sermon_id TEXT,

  user_name TEXT NOT NULL,
  preacher_name TEXT NOT NULL,
  church_name TEXT NOT NULL,

  sermon_date DATE NOT NULL,
  sermon_time TEXT,

  sermon_title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  main_verse TEXT NOT NULL,
  secondary_verses JSONB NOT NULL DEFAULT '[]'::jsonb,

  introduction TEXT,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlighted_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,

  personal_observations TEXT,
  practical_applications TEXT,
  conclusion TEXT,
  final_summary TEXT,

  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'published',
  source TEXT NOT NULL DEFAULT 'android_app',

  views_count INTEGER NOT NULL DEFAULT 0,

  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_published_sermons_visibility
    CHECK (visibility IN ('public', 'private')),

  CONSTRAINT chk_published_sermons_status
    CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),

  CONSTRAINT chk_published_sermons_source
    CHECK (source IN ('android_app', 'web_admin', 'import'))
);
7. Estrutura JSONB dos Campos Dinâmicos
secondary_verses
[
  "Romanos 10:17",
  "Hebreus 11:6"
]
key_points
[
  {
    "id": "point-1",
    "title": "A fé vem pelo ouvir",
    "content": "A fé é fortalecida pela Palavra de Deus.",
    "order": 1
  }
]
highlighted_phrases
[
  "A fé não ignora a realidade, mas confia em Deus acima dela.",
  "A Palavra sustenta o coração nos dias difíceis."
]
8. Tabela: sermon_view_logs
Objetivo

Registrar visualizações das mensagens públicas.

Essa tabela permitirá dashboards futuros com:

mensagens mais acessadas;
acessos por período;
origem dos acessos;
contagem real de visualizações.
Campos
Campo	Tipo	Obrigatório	Descrição
id	uuid	sim	ID do log
sermon_id	uuid	sim	mensagem acessada
viewer_ip_hash	text	não	hash do IP
user_agent	text	não	navegador/dispositivo
referrer	text	não	origem do acesso
viewed_at	timestamptz	sim	data do acesso
SQL
CREATE TABLE IF NOT EXISTS public.sermon_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sermon_id UUID NOT NULL REFERENCES public.published_sermons(id) ON DELETE CASCADE,

  viewer_ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,

  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
9. Tabela: publication_events
Objetivo

Registrar eventos importantes no ciclo de vida de uma publicação.

Eventos possíveis:

created
updated
published
unpublished
archived
visibility_changed
Campos
Campo	Tipo	Obrigatório	Descrição
id	uuid	sim	ID do evento
sermon_id	uuid	sim	mensagem relacionada
user_id	uuid	sim	usuário responsável
event_type	text	sim	tipo do evento
old_status	text	não	status anterior
new_status	text	não	novo status
old_visibility	text	não	visibilidade anterior
new_visibility	text	não	nova visibilidade
metadata	jsonb	sim	dados extras
created_at	timestamptz	sim	data do evento
SQL
CREATE TABLE IF NOT EXISTS public.publication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sermon_id UUID NOT NULL REFERENCES public.published_sermons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,

  old_status TEXT,
  new_status TEXT,

  old_visibility TEXT,
  new_visibility TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_publication_events_event_type
    CHECK (
      event_type IN (
        'created',
        'updated',
        'published',
        'unpublished',
        'archived',
        'visibility_changed'
      )
    )
);
10. Índices
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_published_sermons_user_id
ON public.published_sermons(user_id);

CREATE INDEX IF NOT EXISTS idx_published_sermons_slug
ON public.published_sermons(slug);

CREATE INDEX IF NOT EXISTS idx_published_sermons_visibility_status
ON public.published_sermons(visibility, status);

CREATE INDEX IF NOT EXISTS idx_published_sermons_sermon_date
ON public.published_sermons(sermon_date DESC);

CREATE INDEX IF NOT EXISTS idx_published_sermons_created_at
ON public.published_sermons(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_published_sermons_preacher_name
ON public.published_sermons(preacher_name);

CREATE INDEX IF NOT EXISTS idx_published_sermons_church_name
ON public.published_sermons(church_name);

CREATE INDEX IF NOT EXISTS idx_sermon_view_logs_sermon_id
ON public.sermon_view_logs(sermon_id);

CREATE INDEX IF NOT EXISTS idx_sermon_view_logs_viewed_at
ON public.sermon_view_logs(viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_publication_events_sermon_id
ON public.publication_events(sermon_id);

CREATE INDEX IF NOT EXISTS idx_publication_events_user_id
ON public.publication_events(user_id);

CREATE INDEX IF NOT EXISTS idx_publication_events_created_at
ON public.publication_events(created_at DESC);
11. Busca Textual

Para melhorar a busca pública por título, pregador, igreja e versículo:

CREATE EXTENSION IF NOT EXISTS unaccent;

Adicionar índice full text:

CREATE INDEX IF NOT EXISTS idx_published_sermons_search
ON public.published_sermons
USING GIN (
  to_tsvector(
    'portuguese',
    coalesce(sermon_title, '') || ' ' ||
    coalesce(preacher_name, '') || ' ' ||
    coalesce(church_name, '') || ' ' ||
    coalesce(main_verse, '') || ' ' ||
    coalesce(final_summary, '')
  )
);
12. Triggers
12.1 Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
12.2 Trigger em profiles
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
12.3 Trigger em published_sermons
CREATE TRIGGER trg_published_sermons_updated_at
BEFORE UPDATE ON public.published_sermons
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
12.4 Função para preencher published_at
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
12.5 Trigger de publicação
CREATE TRIGGER trg_set_published_at
BEFORE INSERT OR UPDATE ON public.published_sermons
FOR EACH ROW
EXECUTE FUNCTION public.set_published_at();
13. Controle de Visualizações
Função para incrementar visualização
CREATE OR REPLACE FUNCTION public.increment_sermon_view(
  p_sermon_id UUID,
  p_viewer_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.sermon_view_logs (
    sermon_id,
    viewer_ip_hash,
    user_agent,
    referrer
  )
  VALUES (
    p_sermon_id,
    p_viewer_ip_hash,
    p_user_agent,
    p_referrer
  );

  UPDATE public.published_sermons
  SET views_count = views_count + 1
  WHERE id = p_sermon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
14. Row Level Security — RLS
Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_events ENABLE ROW LEVEL SECURITY;
15. Policies — profiles
Usuário pode ler o próprio perfil
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
Perfis públicos podem ser lidos
CREATE POLICY "Public profiles are readable"
ON public.profiles
FOR SELECT
USING (is_public = TRUE);
Usuário pode atualizar o próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
16. Policies — published_sermons
Leitura pública
CREATE POLICY "Public published sermons are readable"
ON public.published_sermons
FOR SELECT
USING (
  visibility = 'public'
  AND status = 'published'
);
Dono pode ler todas as suas mensagens
CREATE POLICY "Users can read own sermons"
ON public.published_sermons
FOR SELECT
USING (auth.uid() = user_id);
Dono pode criar mensagem
CREATE POLICY "Users can create own sermons"
ON public.published_sermons
FOR INSERT
WITH CHECK (auth.uid() = user_id);
Dono pode atualizar mensagem
CREATE POLICY "Users can update own sermons"
ON public.published_sermons
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
Dono pode excluir mensagem
CREATE POLICY "Users can delete own sermons"
ON public.published_sermons
FOR DELETE
USING (auth.uid() = user_id);
17. Policies — sermon_view_logs
Inserção pública controlada
CREATE POLICY "Anyone can insert sermon view logs"
ON public.sermon_view_logs
FOR INSERT
WITH CHECK (TRUE);
Dono pode consultar logs das próprias mensagens
CREATE POLICY "Users can read view logs from own sermons"
ON public.sermon_view_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.published_sermons ps
    WHERE ps.id = sermon_view_logs.sermon_id
    AND ps.user_id = auth.uid()
  )
);
18. Policies — publication_events
Dono pode consultar eventos das próprias mensagens
CREATE POLICY "Users can read own publication events"
ON public.publication_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.published_sermons ps
    WHERE ps.id = publication_events.sermon_id
    AND ps.user_id = auth.uid()
  )
);
Dono pode criar evento das próprias mensagens
CREATE POLICY "Users can create own publication events"
ON public.publication_events
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.published_sermons ps
    WHERE ps.id = publication_events.sermon_id
    AND ps.user_id = auth.uid()
  )
);
19. Função para Criar Perfil Automaticamente

Quando um usuário for criado no Supabase Auth, criar automaticamente um registro em profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
20. View para Dashboard
View: sermon_dashboard_summary
CREATE OR REPLACE VIEW public.sermon_dashboard_summary AS
SELECT
  user_id,
  COUNT(*) AS total_sermons,
  COUNT(*) FILTER (WHERE status = 'published') AS total_published,
  COUNT(*) FILTER (WHERE visibility = 'private') AS total_private,
  COUNT(*) FILTER (WHERE status = 'unpublished') AS total_unpublished,
  COALESCE(SUM(views_count), 0) AS total_views
FROM public.published_sermons
GROUP BY user_id;
21. View para Mensagens Públicas
CREATE OR REPLACE VIEW public.public_sermons_view AS
SELECT
  id,
  user_id,
  user_name,
  preacher_name,
  church_name,
  sermon_date,
  sermon_time,
  sermon_title,
  slug,
  main_verse,
  secondary_verses,
  introduction,
  key_points,
  highlighted_phrases,
  practical_applications,
  conclusion,
  final_summary,
  views_count,
  published_at,
  updated_at
FROM public.published_sermons
WHERE visibility = 'public'
AND status = 'published';
22. Dados de Teste
INSERT INTO public.published_sermons (
  user_id,
  local_sermon_id,
  user_name,
  preacher_name,
  church_name,
  sermon_date,
  sermon_time,
  sermon_title,
  slug,
  main_verse,
  secondary_verses,
  introduction,
  key_points,
  highlighted_phrases,
  personal_observations,
  practical_applications,
  conclusion,
  final_summary,
  visibility,
  status
)
VALUES (
  auth.uid(),
  'local-test-001',
  'Ricardo',
  'Pastor João',
  'Igreja Exemplo',
  '2026-04-25',
  '19:30',
  'O Poder da Fé',
  'o-poder-da-fe',
  'Hebreus 11:1',
  '["Romanos 10:17", "Hebreus 11:6"]'::jsonb,
  'Uma mensagem sobre confiar em Deus mesmo diante das dificuldades.',
  '[
    {
      "id": "point-1",
      "title": "A fé nasce pela Palavra",
      "content": "A fé é alimentada quando ouvimos e praticamos a Palavra de Deus.",
      "order": 1
    },
    {
      "id": "point-2",
      "title": "A fé produz perseverança",
      "content": "Quem confia em Deus permanece firme mesmo em tempos difíceis.",
      "order": 2
    }
  ]'::jsonb,
  '[
    "A fé vê além das circunstâncias.",
    "Deus sustenta quem confia nele."
  ]'::jsonb,
  'Preciso aplicar mais confiança nas decisões do dia a dia.',
  'Orar mais, estudar a Palavra e agir com fé.',
  'A fé verdadeira se revela em uma vida de confiança e obediência.',
  'A mensagem ensina que a fé é uma confiança prática em Deus, fundamentada na Palavra e demonstrada por atitudes.',
  'public',
  'published'
);
23. Script Consolidado de Migração Inicial

Ordem recomendada para aplicar no Supabase:

1. Extensões
2. Tabelas
3. Índices
4. Functions
5. Triggers
6. Views
7. RLS
8. Policies
9. Dados de teste
24. Ajustes Necessários no App Android

Adicionar na tabela local sermon_notes:

ALTER TABLE sermon_notes
ADD COLUMN web_publication_id TEXT;

ALTER TABLE sermon_notes
ADD COLUMN web_slug TEXT;

ALTER TABLE sermon_notes
ADD COLUMN web_url TEXT;

ALTER TABLE sermon_notes
ADD COLUMN web_publish_status TEXT DEFAULT 'local_only';

ALTER TABLE sermon_notes
ADD COLUMN web_published_at TEXT;

ALTER TABLE sermon_notes
ADD COLUMN web_updated_at TEXT;

ALTER TABLE sermon_notes
ADD COLUMN web_last_error TEXT;
25. Status Local de Publicação
export type WebPublishStatus =
  | "local_only"
  | "published"
  | "updated_locally"
  | "publish_error"
  | "unpublished";
26. Mapeamento App → Web
App SQLite	Web PostgreSQL
id	local_sermon_id
user_name	user_name
preacher_name	preacher_name
church_name	church_name
sermon_date	sermon_date
sermon_time	sermon_time
sermon_title	sermon_title
main_verse	main_verse
secondary_verses	secondary_verses
introduction	introduction
key_points	key_points
highlighted_phrases	highlighted_phrases
personal_observations	personal_observations
practical_applications	practical_applications
conclusion	conclusion
final_summary	final_summary