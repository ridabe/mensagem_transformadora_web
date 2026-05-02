SAD — Software Architecture Document
Mensagem Transformadora Web
1. Visão Geral

A plataforma Mensagem Transformadora Web será a extensão online do aplicativo Android Mensagem Transformadora.

O app Android continuará sendo a ferramenta principal para criação offline de mensagens, sermões e anotações de pregação. A plataforma web será responsável por publicar, exibir, organizar e compartilhar essas mensagens na internet.

2. Objetivo da Arquitetura

Criar uma arquitetura web moderna, segura e escalável, permitindo que mensagens criadas no app Android sejam publicadas em um site com URL própria, controle de visibilidade e futura área administrativa.

3. Princípios Arquiteturais
3.1 App continua offline-first

O app Android não deve depender da internet para funcionar.

A publicação web será sempre opcional.

Criar mensagem no app ≠ publicar automaticamente no site
3.2 Publicação explícita

Nenhuma mensagem deve ser enviada para a web sem ação direta do usuário.

O usuário deve clicar em:

Publicar no site

3.2.1 Moderação (pré-sermões no fluxo web)

Pré-sermões só podem ser publicados na página pública se o conteúdo passar por uma moderação de termos proibidos (badwords). Se a moderação bloquear, a publicação não acontece e o pré-sermão permanece como rascunho/inativo.
3.3 Separação de responsabilidades
App Android
- criar mensagens
- salvar localmente
- editar
- exportar PDF
- backup local

Web
- publicar
- compartilhar
- listar mensagens públicas
- painel administrativo
- estatísticas online
4. Stack Tecnológica Recomendada
4.1 Frontend Web
Next.js + TypeScript

Responsável por:

site público
painel administrativo
páginas públicas das mensagens
SEO
autenticação
dashboard

Estrutura sugerida:

src/
  app/
  components/
  features/
  services/
  lib/
  types/
  styles/
4.2 Backend
Supabase

Responsável por:

banco PostgreSQL
autenticação
políticas de segurança
APIs
storage futuro
integração com o app
4.3 Banco de Dados
PostgreSQL

Banco principal da plataforma web.

4.4 Deploy
Vercel

Para hospedar o frontend Next.js.

Supabase Cloud

Para banco, autenticação e APIs.

5. Arquitetura Geral
┌────────────────────┐
│   App Android      │
│ React Native/Expo  │
│ SQLite Local       │
└─────────┬──────────┘
          │
          │ Publicar mensagem
          │ HTTPS + JWT
          v
┌────────────────────┐
│ Supabase API/Auth  │
│ PostgreSQL + RLS   │
└─────────┬──────────┘
          │
          v
┌────────────────────┐
│ Next.js Web        │
│ Site + Admin       │
└────────────────────┘
6. Módulos do Sistema Web
6.1 Site Público

Responsável por exibir mensagens públicas.

Páginas:

/
 /mensagens
 /mensagens/[slug]
 /sobre
6.2 Área Administrativa

Responsável pela gestão do conteúdo publicado.

Páginas:

/admin
/admin/login
/admin/dashboard
/admin/mensagens
/admin/mensagens/[id]
6.3 API de Publicação

Responsável por receber dados vindos do app Android.

Operações:

POST   /publish-sermon
PUT    /publish-sermon/:id
DELETE /publish-sermon/:id
GET    /my-sermons
6.4 Autenticação

Responsável por identificar o usuário que publica mensagens.

Recomendação inicial:

login com e-mail e senha
login com Google futuramente
JWT via Supabase Auth
7. Modelagem de Dados
7.1 Tabela: profiles

Complementa os dados do usuário autenticado.

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  ministry_name TEXT,
  church_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
7.2 Tabela: published_sermons

Tabela principal das mensagens publicadas.

CREATE TABLE published_sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_sermon_id TEXT,

  user_name TEXT NOT NULL,
  preacher_name TEXT NOT NULL,
  church_name TEXT NOT NULL,

  sermon_date DATE NOT NULL,
  sermon_time TEXT,

  sermon_title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  main_verse TEXT NOT NULL,
  secondary_verses JSONB DEFAULT '[]',

  introduction TEXT,
  key_points JSONB DEFAULT '[]',
  highlighted_phrases JSONB DEFAULT '[]',

  personal_observations TEXT,
  practical_applications TEXT,
  conclusion TEXT,
  final_summary TEXT,

  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'published',

  views_count INTEGER NOT NULL DEFAULT 0,

  published_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
7.3 Campos de controle
visibility
public
private
status
draft
published
unpublished
archived
7.4 Índices recomendados
CREATE INDEX idx_published_sermons_user_id
ON published_sermons(user_id);

CREATE INDEX idx_published_sermons_slug
ON published_sermons(slug);

CREATE INDEX idx_published_sermons_visibility
ON published_sermons(visibility);

CREATE INDEX idx_published_sermons_status
ON published_sermons(status);

CREATE INDEX idx_published_sermons_sermon_date
ON published_sermons(sermon_date DESC);

CREATE INDEX idx_published_sermons_church_name
ON published_sermons(church_name);

CREATE INDEX idx_published_sermons_preacher_name
ON published_sermons(preacher_name);
8. Segurança
8.1 Row Level Security

Todas as tabelas sensíveis devem ter RLS ativo.

ALTER TABLE published_sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
8.2 Política para leitura pública

Mensagens públicas podem ser lidas sem login.

CREATE POLICY "Public sermons are readable"
ON published_sermons
FOR SELECT
USING (
  visibility = 'public'
  AND status = 'published'
);
8.3 Política para dono da mensagem

Usuário autenticado pode gerenciar suas próprias mensagens.

CREATE POLICY "Users can manage own sermons"
ON published_sermons
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
9. Fluxo App Android → Web
9.1 Publicação inicial
1. Usuário cria mensagem no app
2. Usuário abre Detalhes
3. Clica em "Publicar no site"
4. App verifica conexão
5. App verifica login
6. App envia dados para Supabase/API
7. Backend salva publicação
8. Backend retorna slug e URL pública
9. App salva status local
10. App exibe botão compartilhar
9.2 Atualização de mensagem publicada
1. Usuário edita mensagem no app
2. App marca status como "updated_locally"
3. Usuário clica em "Atualizar publicação"
4. API atualiza registro online
5. App marca como "published"
9.3 Despublicação
1. Usuário clica em "Despublicar"
2. API altera status para "unpublished"
3. Página pública deixa de aparecer
4. App mantém mensagem local
10. Alterações necessárias no App Android

Adicionar campos locais à tabela de anotações:

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
10.1 Status local de publicação
type WebPublishStatus =
  | "local_only"
  | "published"
  | "updated_locally"
  | "publish_error"
  | "unpublished";
11. APIs Necessárias
11.1 Publicar mensagem
POST /api/sermons
Authorization: Bearer JWT

Payload:

{
  "localSermonId": "abc123",
  "userName": "Ricardo",
  "preacherName": "Pastor João",
  "churchName": "Igreja Exemplo",
  "sermonDate": "2026-04-25",
  "sermonTitle": "O Poder da Fé",
  "mainVerse": "Hebreus 11:1",
  "secondaryVerses": ["Romanos 10:17"],
  "introduction": "Mensagem sobre fé.",
  "keyPoints": [
    {
      "title": "A fé vem pelo ouvir",
      "content": "A fé é alimentada pela Palavra.",
      "order": 1
    }
  ],
  "finalSummary": "A mensagem ensina sobre confiar em Deus.",
  "visibility": "public"
}

Resposta:

{
  "id": "uuid",
  "slug": "o-poder-da-fe",
  "url": "https://mensagemtransformadora.com/mensagens/o-poder-da-fe"
}
11.2 Atualizar mensagem
PUT /api/sermons/:id
Authorization: Bearer JWT
11.3 Despublicar mensagem
PATCH /api/sermons/:id/unpublish
Authorization: Bearer JWT
11.4 Listar minhas mensagens
GET /api/me/sermons
Authorization: Bearer JWT
11.5 Listar mensagens públicas
GET /api/public/sermons
11.6 Obter mensagem pública
GET /api/public/sermons/:slug
12. Estrutura Recomendada do Projeto Web
mensagem-transformadora-web/
  src/
    app/
      page.tsx
      mensagens/
        page.tsx
        [slug]/
          page.tsx
      admin/
        page.tsx
        login/
          page.tsx
        dashboard/
          page.tsx
        mensagens/
          page.tsx

    components/
      layout/
      sermon/
      dashboard/
      forms/
      ui/

    features/
      sermons/
        sermon.types.ts
        sermon.service.ts
        sermon.repository.ts
        sermon.mapper.ts

      auth/
        auth.service.ts
        auth.types.ts

    lib/
      supabase/
        client.ts
        server.ts
      slugify.ts
      dates.ts

    styles/
      globals.css
13. Regras de Slug

O slug deve ser gerado com base no título da mensagem.

Exemplo:

Título: O Poder da Fé
Slug: o-poder-da-fe

Se já existir:

o-poder-da-fe
o-poder-da-fe-2
o-poder-da-fe-3
14. SEO

Cada página pública deve conter:

title dinâmico
description
Open Graph
Twitter Card
URL canônica
dados estruturados futuramente

Exemplo:

O Poder da Fé — Mensagem Transformadora
Mensagem ministrada por Pastor João na Igreja Exemplo, baseada em Hebreus 11:1.
15. Dashboard Web

Indicadores do painel:

total de mensagens publicadas
total de mensagens privadas
total de visualizações
mensagens mais acessadas
publicações por mês
pregadores mais frequentes
igrejas mais frequentes
16. Estratégia de Deploy
16.1 Frontend

Hospedagem:

Vercel

Ambientes:

development
preview
production

Variáveis:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
16.2 Banco

Hospedagem:

Supabase Cloud

Ambientes recomendados:

dev
production
17. Regras de Privacidade

A plataforma deve deixar claro:

Suas mensagens permanecem privadas no app.
Somente serão publicadas quando você escolher enviar para o site.
18. Roadmap Técnico
Fase 1 — Base Web
criar projeto Next.js
configurar Supabase
criar tabelas
configurar RLS
criar layout público
criar listagem pública
criar página individual
Fase 2 — Admin
login
dashboard
minhas mensagens
editar publicação
despublicar
Fase 3 — Integração App
login no app
publicar mensagem
atualizar publicação
salvar URL pública localmente
compartilhar link
Fase 4 — Evolução
perfil público
perfil da igreja
estatísticas avançadas
favoritos online
IA para revisão textual
geração de imagem social para mensagem
19. Decisões Arquiteturais
Decisão 1

O app Android continuará offline-first.

Decisão 2

A web será opcional e complementar.

Decisão 3

Supabase será usado para acelerar autenticação, banco e segurança.

Decisão 4

Next.js será usado por causa de SEO, performance e facilidade de deploy.

Decisão 5

A publicação será controlada pelo usuário.

20. Visão Final

A arquitetura proposta permite que o Mensagem Transformadora evolua de um app local de anotações para uma plataforma completa de publicação cristã.

O produto passa a ter dois pilares:

App Android = criação e organização pessoal
Web = publicação, compartilhamento e alcance
