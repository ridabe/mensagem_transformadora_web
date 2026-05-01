# API — Publicação de Mensagens (Sermons)

Este documento descreve as rotas de API previstas para **envio/publicação** e **consulta** de mensagens/sermões na plataforma Mensagem Transformadora Web, em conformidade com o SAD/MDD.

## Base URL (ambiente atual)

- O endereço do site (provisório) está definido em `URL_SITE` no `.env`.
- Em produção (Vercel), use o domínio efetivo configurado para o projeto.

## Autenticação

- Rotas que começam com `/api/me` e `/api/sermons` exigem usuário autenticado via Supabase Auth.
- Envie o token de acesso do Supabase no header:

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
Content-Type: application/json
```

## Convenções

- Datas devem ser enviadas em `YYYY-MM-DD` (`sermon_date`).
- Campos JSON devem ser enviados como JSON (arrays/objetos).
- A publicação é **explícita**: nada é publicado automaticamente. Chamar a API é uma ação de publicação/gestão.

## Tipos (referência)

### `visibility`

- `public`
- `private`

### `status`

- `draft`
- `published`
- `unpublished`
- `archived`

### `source`

- `android_app`
- `web_admin`
- `import`

## Payload da API (Android)

As rotas de escrita aceitam **camelCase** (padrão do app Android) e também **snake_case** (nomes do banco).

### Exemplo (camelCase)

```json
{
  "localSermonId": "abc123",
  "userName": "Ricardo",
  "preacherName": "Pastor João",
  "churchName": "Igreja Exemplo",
  "sermonDate": "2026-04-25",
  "sermonTime": "19:30",
  "sermonTitle": "O Poder da Fé",
  "mainVerse": "Hebreus 11:1",
  "secondaryVerses": ["Romanos 10:17"],
  "introduction": "Mensagem sobre fé.",
  "keyPoints": [
    { "id": "point-1", "title": "A fé vem pelo ouvir", "content": "…", "order": 1 }
  ],
  "highlightedPhrases": ["A fé não ignora a realidade…"],
  "personalObservations": "…",
  "practicalApplications": "…",
  "conclusion": "…",
  "finalSummary": "…",
  "visibility": "public",
  "status": "published"
}
```

## Mapeamento para o banco: `published_sermons`

Campos conforme MDD (`public.published_sermons`):

```json
{
  "local_sermon_id": "string | null",
  "user_name": "string",
  "preacher_name": "string",
  "church_name": "string",
  "sermon_date": "YYYY-MM-DD",
  "sermon_time": "string | null",
  "sermon_title": "string",
  "main_verse": "string",
  "secondary_verses": ["string"],
  "introduction": "string | null",
  "key_points": [
    { "id": "string", "title": "string", "content": "string", "order": 1 }
  ],
  "highlighted_phrases": ["string"],
  "personal_observations": "string | null",
  "practical_applications": "string | null",
  "conclusion": "string | null",
  "final_summary": "string | null",
  "visibility": "public | private",
  "status": "draft | published | unpublished | archived"
}
```

Observações:
- `slug` é gerado no backend a partir de `sermon_title` (regras no SAD/MDD).
- `source` deve ser definido pelo backend (por padrão `android_app` para envios do app).

## Rotas (implementadas)

### 1) Publicar mensagem (criar)

`POST /api/sermons`

Requer autenticação: **sim**

Payload: **ver seção “Payload da API (Android)”** (mínimo obrigatório: `userName`, `preacherName`, `churchName`, `sermonDate`, `sermonTitle`, `mainVerse`)

Resposta (exemplo):

```json
{
  "id": "uuid",
  "slug": "o-poder-da-fe",
  "url": "https://<seu-dominio>/mensagens/o-poder-da-fe"
}
```

Erros comuns:
- `401` sem token ou token inválido
- `400` payload inválido
- `409/500` conflito/erro ao gerar slug (o backend aplica sufixos `-2`, `-3`, etc.)

---

### 1b) Publicar mensagem (integração Android sem login)

`POST /api/integrations/android/sermons`

Requer autenticação: **não (sem Supabase Auth)**  
Proteção: **sim (token fixo de integração)**

Headers obrigatórios:

```http
Content-Type: application/json
x-app-publish-token: <ANDROID_PUBLISH_TOKEN>
```

Observações:
- Esta rota é destinada ao app Android offline-first, que não possui login de usuário.
- O backend valida o header `x-app-publish-token` comparando com `ANDROID_PUBLISH_TOKEN`.
- Como não há usuário autenticado, o backend salva com `user_id = ANDROID_DEFAULT_USER_ID` (UUID de um usuário existente no Supabase Auth).
- A URL retornada usa `NEXT_PUBLIC_SITE_URL` (se existir) e faz fallback para `https://mensagem-transformadora-web.vercel.app`.

Resposta (sucesso):

```json
{
  "id": "uuid",
  "slug": "o-poder-da-fe",
  "url": "https://mensagem-transformadora-web.vercel.app/mensagens/o-poder-da-fe"
}
```

Resposta (token ausente/inválido):

```json
{
  "error": "Token de publicação inválido."
}
```

Resposta (payload inválido):

```json
{
  "error": "Payload inválido.",
  "details": ["Campo sermonTitle é obrigatório."]
}
```

---

### 2) Atualizar mensagem publicada

`PUT /api/sermons/:id`

Requer autenticação: **sim**

Payload: campos editáveis (pode ser parcial), usando os mesmos nomes do payload da API (camelCase) ou do banco (snake_case).

Exemplo:

```json
{
  "sermon_title": "O Poder da Fé (rev.)",
  "final_summary": "Resumo atualizado.",
  "visibility": "public",
  "status": "published"
}
```

Resposta (exemplo):

```json
{
  "id": "uuid",
  "slug": "o-poder-da-fe-rev",
  "url": "https://<seu-dominio>/mensagens/o-poder-da-fe-rev"
}
```

Observações:
- Se `sermon_title` mudar, o backend pode recalcular o `slug` e garantir unicidade.
- O usuário só pode atualizar registros cujo `user_id` seja dele (RLS).

---

### 3) Despublicar mensagem

`PATCH /api/sermons/:id/unpublish`

Requer autenticação: **sim**

Payload: vazio

Resposta (exemplo):

```json
{
  "id": "uuid",
  "status": "unpublished"
}
```

Observação:
- Esta rota deve apenas alterar `status` para `unpublished` (não apagar o registro).

---

### 4) Listar minhas mensagens (admin/app)

`GET /api/me/sermons`

Requer autenticação: **sim**

Query params (opcionais):
- `page` (default: 1)
- `pageSize` (default: 20)
- `status` (`draft|published|unpublished|archived`)
- `visibility` (`public|private`)

Resposta (exemplo):

```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "local_sermon_id": "local-123",
      "user_name": "Ricardo",
      "preacher_name": "Pastor João",
      "church_name": "Igreja Exemplo",
      "sermon_date": "2026-04-25",
      "sermon_time": "19:30",
      "sermon_title": "O Poder da Fé",
      "slug": "o-poder-da-fe",
      "main_verse": "Hebreus 11:1",
      "secondary_verses": ["Romanos 10:17"],
      "introduction": null,
      "key_points": [],
      "highlighted_phrases": [],
      "personal_observations": null,
      "practical_applications": null,
      "conclusion": null,
      "final_summary": null,
      "visibility": "public",
      "status": "published",
      "source": "android_app",
      "views_count": 0,
      "published_at": "2026-04-25T22:10:00.000Z",
      "created_at": "2026-04-25T22:10:00.000Z",
      "updated_at": "2026-04-25T22:10:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

---

### 5) Listar mensagens públicas

`GET /api/public/sermons`

Requer autenticação: **não**

Query params (opcionais):
- `q` (busca textual)
- `page` (default: 1)
- `pageSize` (default: 12)

Resposta: mesma estrutura de paginação (`items/page/pageSize/total`), retornando apenas mensagens `visibility=public` e `status=published`.

---

### 6) Obter mensagem pública por slug

`GET /api/public/sermons/:slug`

Requer autenticação: **não**

Resposta: um único registro com os campos públicos da mensagem.

---

### 7) Obter pré-sermão por código (uso no app)

`GET /api/pre-sermons/by-code?code=MT-XXXXX`

Requer autenticação: **não**

Regras:
- Retorna apenas se `status = active`.
- Retorna um recorte do pré-sermão (para consumo no app), sem IDs internos.
- Não retorna a mensagem completa (`full_sermon`).
- `leader.name` já vem formatado com a função ministerial (quando disponível), ex.: `Pr. Paulo`.

Resposta (200):

```json
{
  "success": true,
  "sermon": {
    "shareCode": "MT-K8F3Q",
    "title": "...",
    "mainVerse": "...",
    "secondaryVerses": [],
    "leader": { "name": "Pr. Paulo" },
    "church": { "name": "..." }
  }
}
```

Respostas de erro:
- `400` — parâmetro `code` ausente ou inválido
- `404` — não encontrado (inclui casos em que existe, mas não está active)
- `500` — falha ao consultar

## Publicação via Pré-sermão (Web)

Além das rotas acima, existe o fluxo de publicação pela área do líder (UI web):
- O líder pode preencher `full_sermon` no pré-sermão.
- Ao publicar, o sistema cria um registro em `published_sermons` com `visibility=public` e `status=published`, e abre a URL pública `/mensagens/[slug]`.

Observação:
- O campo `source` usado atualmente para esse fluxo é `web_admin` (mesmo quando publicado pela área do líder).

## Eventos e logs (futuros)

Tabelas previstas no MDD (para dashboards futuros):
- `sermon_view_logs` (registro de visualizações)
- `publication_events` (ciclo de vida: created/updated/published/unpublished etc.)

As rotas para criação/consulta desses dados podem ser adicionadas posteriormente, sem alterar o modelo de dados definido.
