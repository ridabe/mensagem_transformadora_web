# Manual de Uso — Mensagem Transformadora Web

Este manual explica como usar o site público e a área administrativa (Admin), tanto em produção quanto localmente para desenvolvimento.

---

## 1) Visão geral

O Mensagem Transformadora Web tem três espaços:

- **Site público**: vitrine de mensagens publicadas (SEO, compartilhamento e leitura).
- **Área do líder**: área privada para criação e gestão de pré-sermões, com opção de escrever a mensagem completa e publicar no site (login obrigatório).
- **Admin**: área privada para gestão administrativa (login obrigatório).

Nada é publicado automaticamente: uma mensagem só aparece no site público quando estiver **Publicada** e com **Visibilidade Pública**.

---

## 2) Site público (sem login)

### 2.1 Página inicial (`/`)

Mostra o posicionamento do produto e uma seção de “Últimas mensagens publicadas”.

Atalhos principais:

- **Ver mensagens** → vai para a listagem pública.
- **Baixar App** → abre a Play Store.

### 2.2 Listagem pública de mensagens (`/mensagens`)

O que você encontra:

- Campo de busca por texto.
- Lista de cards com mensagens públicas.
- Paginação (Anterior/Próxima).

Busca:

- O campo “Buscar” pesquisa em:
  - título
  - pregador
  - igreja
  - versículo base
  - resumo final

Quando não há mensagens:

- O site exibe um estado vazio indicando que as mensagens aparecerão quando forem publicadas.

### 2.3 Página pública da mensagem (`/mensagens/[slug]`)

O que aparece:

- Informações da mensagem (título, pregador, igreja, data, versículo base).
- Conteúdo textual (introdução, pontos principais e demais seções, quando existirem).

Contagem de visualizações:

- Ao abrir uma mensagem, o site registra uma visualização (incrementa `views_count`) e grava um log (com hash do IP, user-agent e referer quando disponíveis).
- Se o registro falhar, a página continua abrindo normalmente (sem quebrar a leitura).

### 2.4 Sobre (`/sobre`)

Página institucional com explicação do propósito da plataforma.

---

## 3) Área do líder (com login)

### 3.1 Rotas da área do líder

- `/login` — login do líder
- `/lider` — redireciona para a listagem de pré-sermões
- `/lider/sermoes` — listagem de pré-sermões
- `/lider/sermoes/novo` — criação de pré-sermão
- `/lider/sermoes/[id]/editar` — edição e arquivamento
- `/lider/assinatura` — assinatura/plano

### 3.2 Pré-sermões (o que são)

Pré-sermões são rascunhos estruturados com:

- **Título**
- **Versículo principal**
- **Versículos secundários** (opcional)
- **Notas** (opcional)
- **Mensagem completa** (opcional) — quando preenchida, pode ser publicada no site
- **Status** (rascunho/ativo/arquivado)
- **Código compartilhável** no formato `MT-XXXXX` (gerado automaticamente)

Regras práticas:

- Cada pré-sermão é visível apenas para o líder logado.
- O código `MT-XXXXX` pode ser copiado para compartilhamento e uso no app Android (o app consome um recorte do conteúdo, não a mensagem completa).
- Quando a **Mensagem completa** está preenchida, o líder pode **Publicar** e gerar uma página pública completa em `/mensagens/[slug]`.

### 3.3 Listagem de pré-sermões (`/lider/sermoes`)

O que você encontra:

- Lista de pré-sermões ordenada por atualização.
- Ação **Novo pré-sermão**.
- Ação **Copiar código** (shareCode).
- Ação **Editar** (quando não estiver arquivado).
- Ação **Arquivar** (quando não estiver arquivado).

### 3.4 Criar pré-sermão (`/lider/sermoes/novo`)

Passo a passo:

1. Abra `/lider/sermoes/novo`.
2. Preencha **Título** e **Versículo principal**.
3. (Opcional) Adicione versículos secundários e notas.
4. (Opcional) Preencha **Mensagem completa** se quiser publicar no site.
5. Clique em **Salvar**.

Após salvar:

- O sistema gera um código `MT-XXXXX`.
- Você pode copiar o código diretamente pela listagem.

### 3.5 Editar/arquivar (`/lider/sermoes/[id]/editar`)

Na edição, você pode:

- Atualizar campos do pré-sermão.
- Alternar status entre **Rascunho** e **Ativo**.
- Copiar o código `MT-XXXXX`.
- Preencher a **Mensagem completa** (opcional).
- **Publicar no site** (quando a mensagem completa estiver preenchida).
- **Arquivar** (após arquivar, a edição fica bloqueada).

Publicação no site:

- Ao publicar, o sistema cria uma mensagem em `published_sermons` (visibilidade pública e status publicado) e redireciona para `/mensagens/[slug]`.
- Depois de publicada, a tela de edição mostra o botão **Abrir no site**.

---

## 4) Admin (com login)

### 4.1 Rotas do Admin

- `/admin/login` — login do Admin
- `/admin/dashboard` — painel com indicadores
- `/admin/mensagens` — lista das suas mensagens
- `/admin/mensagens/[id]` — edição de uma publicação específica

### 4.2 Pré-requisitos (variáveis de ambiente)

Para o login do Admin funcionar, configure no ambiente (produção/Vercel ou local):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **ou** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sem essas variáveis:

- O Admin não consegue autenticar (o site evita quebrar e mostra mensagem de “Supabase não configurado”).

Observação: o site também usa `CONNECTION_STRING` (Postgres) para as páginas públicas e registro de views.

### 4.3 Acessar o Admin (passo a passo)

1. Abra `/admin/login`.
2. Informe e-mail e senha (credenciais do Supabase Auth do projeto).
3. Ao autenticar, você será redirecionado para `/admin/dashboard`.

Proteção de rota:

- Rotas `/admin/*` exigem sessão válida.
- Se você tentar abrir `/admin/dashboard` sem login, será redirecionado para `/admin/login`.

### 4.4 Dashboard (`/admin/dashboard`)

Mostra indicadores agregados por usuário:

- total de mensagens
- total publicadas
- total privadas
- total despublicadas
- total de visualizações

### 4.5 Minhas mensagens (`/admin/mensagens`)

Mostra até 50 mensagens do usuário logado, com:

- data da pregação
- contagem de views
- visibilidade (public/private)
- status (draft/published/unpublished/archived)
- ação “Abrir público”
- ação “Editar”

### 4.6 Editar publicação (`/admin/mensagens/[id]`)

Na tela de edição, você pode:

- alterar **Título**
- alterar **Versículo base**
- alterar **Resumo final**
- alterar **Visibilidade**:
  - Pública
  - Privada
- alterar **Status**:
  - Publicado
  - Despublicado
  - Rascunho
  - Arquivado
- **Excluir** a publicação (remove o registro do banco)

Regras práticas:

- Para aparecer no site público: `visibility = public` **e** `status = published`.
- Se você colocar `visibility = private`, ela não aparecerá no público (mesmo que publicada).
- Se você colocar `status = unpublished`, ela some da listagem pública e da página pública (o slug deixa de resolver no público, pois o público filtra por publicado + público).

Botões:

- **Salvar**: grava as alterações.
- **Abrir público**: abre a URL pública baseada no `slug`.
- **Excluir**: remove a publicação.

### 4.7 Sair

No topo do Admin existe o botão **Sair**, que encerra a sessão e volta para o login.

---

## 5) Publicação de mensagens (origem no app e no pré-sermão)

O fluxo esperado (produto):

1. Usuário cria a mensagem no app (offline-first) **ou** o líder escreve a mensagem completa no pré-sermão (web).
2. Quando quiser, publica no site.
3. A mensagem passa a ter:
   - `slug` e URL pública compartilhável
   - estado de publicação controlado (public/private + status)

Atualmente, o Admin é o lugar para:

- revisar e ajustar o que está publicado
- despublicar
- privatizar
- excluir

---

## 6) Analytics (Vercel)

O site inclui o componente de Analytics da Vercel (integração com App Router).

O que isso significa:

- eventos de navegação/rotas são capturados automaticamente quando o projeto está rodando sob a Vercel com Analytics habilitado no projeto.

---

## 7) Operação local (desenvolvimento)

### 7.1 Rodar o projeto

No diretório do projeto:

- `npm install`
- `npm run dev`

### 7.2 Banco / MDD (estrutura)

Existe um script para aplicar a modelagem do banco (MDD) no Postgres do Supabase usando `CONNECTION_STRING`:

- `node scripts/apply_mdd.js`

Esse script é idempotente e cria:

- tabelas (`profiles`, `published_sermons`, `sermon_view_logs`, `publication_events`)
- índices
- triggers
- views (`public_sermons_view`, `sermon_dashboard_summary`)
- RLS e policies
- funções (inclui incremento de visualização)

---

## 8) Solução de problemas (FAQ)

### 8.1 “Supabase não está configurado no ambiente”

Causa:

- faltam `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Correção:

- configure as variáveis no ambiente (Vercel) ou em um arquivo local equivalente ao seu setup.

### 8.2 Admin redireciona para o login mesmo após autenticar

Possíveis causas:

- cookies bloqueados
- keys/URL do Supabase incorretos
- sessão não persistida por configuração do domínio/ambiente

Correção:

- valide as variáveis de ambiente e teste em uma janela anônima.

### 8.3 Mensagens não aparecem no público

Checklist:

- `visibility` está **public**?
- `status` está **published**?
- o registro existe no banco `published_sermons`?

### 8.4 Página pública da mensagem “não encontrada”

Checklist:

- o `slug` é o mesmo do registro?
- a mensagem está com `visibility = public` e `status = published`?

---

## 9) Referência rápida de URLs

- Site:
  - `/`
  - `/mensagens`
  - `/mensagens/[slug]`
  - `/sobre`
- Área do líder:
  - `/login`
  - `/lider`
  - `/lider/sermoes`
  - `/lider/sermoes/novo`
  - `/lider/sermoes/[id]/editar`
  - `/lider/assinatura`
- Admin:
  - `/admin/login`
  - `/admin/dashboard`
  - `/admin/mensagens`
  - `/admin/mensagens/[id]`
- API pública:
  - `/api/pre-sermons/by-code?code=MT-XXXXX`
  - `/api/public/sermons`
  - `/api/public/sermons/[slug]`

