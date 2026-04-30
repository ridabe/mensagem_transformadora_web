# Mensagem Transformadora Web

Plataforma web do ecossistema **Mensagem Transformadora**.

O objetivo do projeto é permitir que mensagens/sermões criados no app Android (offline-first) sejam **publicados opcionalmente** na internet com URL própria, com controle de visibilidade e ciclo de vida (rascunho/publicado/despublicado/arquivado).

## Visão geral

- **App Android (offline-first):** criação e organização de mensagens/sermões localmente (sem dependência de internet).
- **Web (Next.js):** site público para leitura e compartilhamento, além de área administrativa para gestão.
- **Backend (Supabase):** autenticação, banco PostgreSQL com RLS, e persistência das publicações.

Princípio central do sistema:

- **Publicação explícita:** criar no app não significa publicar automaticamente na web. A publicação é uma ação intencional do usuário.

## Páginas e rotas

**Site público**

- `GET /` — Home
- `GET /mensagens` — Listagem de mensagens públicas
- `GET /mensagens/[slug]` — Página pública do sermão/mensagem
- `GET /sobre` — Página institucional

**Área do líder (privada)**

- `GET /lider` — Redireciona para pré-sermões
- `GET /lider/sermoes` — Listagem de pré-sermões
- `GET /lider/sermoes/novo` — Criar pré-sermão
- `GET /lider/sermoes/[id]/editar` — Editar/arquivar pré-sermão
- `GET /lider/assinatura` — Assinatura/plano

**API (Next.js Route Handlers)**

- `POST /api/sermons` — Publicar mensagem (criar) (requer autenticação)
- `PUT /api/sermons/:id` — Atualizar mensagem publicada (requer autenticação)
- `PATCH /api/sermons/:id/unpublish` — Despublicar (requer autenticação)
- `GET /api/me/sermons` — Listar minhas mensagens (requer autenticação)
- `GET /api/public/sermons` — Listar mensagens públicas (sem autenticação)
- `GET /api/public/sermons/:slug` — Obter mensagem pública por slug (sem autenticação)
- `GET /api/pre-sermons/by-code?code=MT-XXXXX` — Obter pré-sermão ativo por código (sem autenticação)

## Modelo de dados (resumo)

Entidade principal: `public.published_sermons`

- `slug` gerado no backend a partir de `sermon_title` (com sufixos quando necessário)
- filtros públicos: `visibility = 'public'` e `status = 'published'`
- campos principais: título, pregador, igreja, data, versículos, introdução, pontos, frases, observações, aplicações, conclusão e resumo final

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Auth + Postgres + RLS)
- PostgreSQL (via `pg` no server)
- Tailwind CSS
- Deploy: Vercel

## Como rodar localmente

Pré-requisitos:

- Node.js (LTS recomendado)
- Dependências instaladas: `npm install`
- Variáveis de ambiente configuradas localmente

Para criar o arquivo local de ambiente a partir do exemplo:

```bash
npm run env:setup
```

Depois edite `.env.local` e preencha os valores reais do Supabase e de pagamentos antes de rodar.

Comandos:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Documentação do projeto

Os documentos de referência ficam em `/docs`:

- `api.md` — Rotas e payloads de API
- `sad.md` — Documento de Arquitetura (SAD)
- `mdd.md` — Modelagem de Dados (MDD)
- `ux.md` — Fluxos e requisitos de UX

## Desenvolvedor / Empresa

- **Empresa:** Algoritmum Desenvolvimento
- **Responsável técnico:** Ricardo Bene
