# Guia de Uso — Admin Global (Etapa 3)

## 📍 Como Acessar

### Para Admin Global
1. Faça login em `/admin/login` com credenciais de admin
2. Na barra de navegação, clique em **"Admin Global"**
3. Você será direcionado para `/admin/global/igrejas`

### URL Direta
- **Página Principal:** `http://seu-dominio.com/admin/global/igrejas`
- **Criar Igreja:** `http://seu-dominio.com/admin/global/igrejas/nova`
- **Detalhes Igreja:** `http://seu-dominio.com/admin/global/igrejas/{id}`

---

## 🏠 Funcionalidades Principais

### 1. Listar Igrejas (`/admin/global/igrejas`)

**O que você vê:**
- Tabela com todas as igrejas registradas
- Colunas: Nome, Localização, Plano, Status, Data Criação
- Cards com resumo de estatísticas

**Ações possíveis:**
- Clicar em "Ver detalhes" para editar ou visualizar usuários
- Clicar em "+ Nova Igreja" para registrar uma nova

**Filtros e Mensagens:**
- Mensagem de sucesso após criar/editar
- Mensagens de erro se algo der errado
- Contagem total de igrejas no rodapé

---

### 2. Criar Nova Igreja (`/admin/global/igrejas/nova`)

**Campos Obrigatórios:**
- **Nome da Igreja*** — Identificação da congregação

**Campos Opcionais:**
- **Cidade** — Localização geográfica
- **Estado (UF)** — Sigla do estado (ex: SP, RJ)
- **Status** — Ativa ou Inativa

**Após criar:**
- Redirecionado para lista de igrejas
- Mensagem de sucesso exibida
- Novo registro aparece na tabela

---

### 3. Editar Detalhes da Igreja (`/admin/global/igrejas/[id]`)

**Aba de Informações Básicas:**
- Nome, Cidade, Estado
- Status (Ativa/Inativa)
- Observações Administrativas (texto livre)

**Cards de Overview:**
- Status atual
- Plano contratado
- Quantidade de usuários
- Data de criação

**Usuários Associados:**
- Tabela com todos os líderes vinculados à igreja
- Colunas: Nome, Email, Função Ministerial, Papel, Data Criação
- **Apenas leitura** (associação feita via auth metadata no cadastro)

**Ações de Controle:**
- Botão "Salvar Alterações" — Persiste edições
- Botão "Ativar/Desativar" — Alterna status da igreja

---

## 🔐 Restrições de Acesso

**Quem pode acessar Admin Global?**
- ✅ Usuários com `role = 'admin'` no profiles
- ❌ Líderes comuns (`role = 'leader'`)
- ❌ Usuários não autenticados

**Se tentar acessar sem permissão:**
- Serão redirecionados para `/lider/sermoes` (líderes)
- Ou para `/admin/login` (não autenticados)

---

## 📊 Campos de Igrejas (Referência)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | texto | ✅ | Nome da igreja |
| `city` | texto | ❌ | Cidade |
| `state` | texto | ❌ | Estado (sigla) |
| `status` | enum | ✅ | `active` \| `inactive` |
| `plan_type` | texto | ✅ | `free` \| `basic` \| `pro` (padrão: free) |
| `plan_status` | texto | ✅ | `active` \| `inactive` (padrão: active) |
| `business_enabled_at` | timestamp | ❌ | Quando Business foi ativado (NULL por padrão) |
| `business_notes` | texto | ❌ | Observações administrativas |
| `created_at` | timestamp | ✅ | Data de criação (automática) |
| `updated_at` | timestamp | ✅ | Data de última edição (automática) |

---

## ⚠️ Comportamentos Importantes

### O que Não Muda
- ❌ **Planos não são ativados automaticamente** — Business plan só é registrado, sem alterar funcionalidades
- ❌ **Usuários não são criados** — Igreja só lista usuários já existentes
- ❌ **Publicações não são alteradas** — Mensagens continuam como estão
- ❌ **RLS não foi modificado** — Políticas de segurança mantidas
- ❌ **App Android não é afetado** — Compatibilidade 100% mantida

### O que Funciona
- ✅ Listagem de igrejas e detalhes
- ✅ Edição de informações básicas
- ✅ Ativação/desativação de igrejas
- ✅ Visualização de usuários associados
- ✅ Anotações administrativas

---

## 🐛 Solução de Problemas

### "Igreja não encontrada"
- Verifique se o ID na URL está correto
- Volte para a lista e tente novamente

### "Erro ao atualizar igreja"
- Verifique se todos os campos obrigatórios estão preenchidos
- Tente recarregar a página

### Não consigo acessar `/admin/global`
- Faça login primeiro em `/admin/login`
- Verifique se sua conta tem `role = 'admin'`
- Se for líder, volte para `/lider/sermoes`

### Campo de observações não salva
- Certifique-se de clicar em "Salvar Alterações"
- Aguarde a mensagem de sucesso

---

## 📝 Exemplos de Uso

### Registrar uma Nova Igreja
```
1. Clique em "+ Nova Igreja"
2. Preencha:
   - Nome: "Igreja Vida em Cristo"
   - Cidade: "São Paulo"
   - Estado: "SP"
   - Status: "Ativa"
3. Clique em "Criar Igreja"
4. Pronto! A igreja aparece na lista
```

### Editar Observações Administrativas
```
1. Na lista, clique em "Ver detalhes" da igreja
2. Role até "Observações Administrativas"
3. Digite notas sobre a situação da igreja
4. Clique em "Salvar Alterações"
5. Mensagem de sucesso aparecerá
```

### Desativar uma Igreja Temporariamente
```
1. Acesse detalhes da igreja
2. Clique em "Desativar"
3. Status mudará para "Inativa"
4. Pode ser reativada a qualquer momento
```

---

## 🔄 Fluxo de Trabalho Recomendado

### Onboarding de Nova Igreja
1. Criar registro em `/admin/global/igrejas/nova`
2. Ir para detalhes e anotar observações (ex: "Aguardando pagamento")
3. Comunicar ao líder da igreja para fazer login
4. O perfil do líder será automaticamente associado à church_id

### Gestão Contínua
1. Verificar lista regularmente para status e quantidade de usuários
2. Atualizar observações conforme evolução do contrato
3. Desativar igrejas que se desvincularem

### Antes de Etapa 4 (Church Admin)
1. Documentar quais igrejas precisarão de sub-administrador
2. Preparar lista de quem será church_admin
3. Revisar quais funcionalidades o Business plan precisa

---

## 📞 Suporte

Se encontrar bugs ou inconsistências:
1. Verifique o console do navegador (F12 → Console)
2. Copie a mensagem de erro
3. Verifique se a Etapa 3 foi bem integrada
4. Consulte o arquivo `docs/etapa-3-relatorio.md` para detalhes técnicos

---

**Última atualização:** 3 de maio de 2026  
**Etapa:** 3 — Admin Global  
**Status:** ✅ Em Produção
