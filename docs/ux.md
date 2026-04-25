# UX Flow — Mensagem Transformadora Web

---

# 1. Objetivo

Definir a experiência de navegação, fluxo de telas, comportamento do usuário e regras visuais da plataforma web **Mensagem Transformadora**, garantindo consistência entre o app Android e a nova plataforma web.

A proposta é manter:

* simplicidade
* clareza
* foco no conteúdo
* navegação intuitiva
* experiência moderna
* responsividade total
* consistência visual com o app Android

---

# 2. Princípios de UX

---

## 2.1 Clareza acima de complexidade

O usuário deve entender imediatamente:

```text
onde está
o que pode fazer
qual o próximo passo
```

Sem excesso de menus ou distrações.

---

## 2.2 Conteúdo é o protagonista

A mensagem/sermão deve ser o foco principal.

A interface não deve competir com o conteúdo.

---

## 2.3 Publicação opcional e transparente

Sempre deixar claro:

```text
Nada será publicado automaticamente.
```

Isso reforça confiança.

---

## 2.4 Mobile First + Desktop Premium

A experiência deve ser excelente em:

* celular
* tablet
* desktop

Mesmo sendo web.

---

## 2.5 CTA forte e simples

O principal CTA sempre será:

```text
Publicar mensagem
```

ou

```text
Baixar aplicativo
```

dependendo do contexto.

---

# 3. Mapa Geral de Navegação

```text
HOME
 ├── Sobre
 ├── Mensagens Públicas
 │     └── Detalhes da Mensagem
 │
 ├── Login
 │
 └── Área Admin
       ├── Dashboard
       ├── Minhas Mensagens
       │      └── Editar Publicação
       │
       ├── Perfil
       └── Configurações
```

---

# 4. Fluxo Público

---

# Tela 1 — Home

## Objetivo

Apresentar a plataforma e gerar entrada no ecossistema.

---

## Estrutura

### Hero principal

Conteúdo:

```text
Transforme suas anotações de pregação
em mensagens organizadas e compartilháveis
```

Botões:

```text
[ Ver mensagens ]
[ Baixar App ]
```

---

### Seção de benefícios

Cards:

* 100% offline no app
* publicação opcional
* exportação PDF
* organização espiritual
* histórico ministerial

---

### Últimas mensagens publicadas

Cards com:

* título
* pregador
* igreja
* data
* botão “Ler mensagem”

---

### Sobre o projeto

Breve explicação da origem do app.

---

### Footer

* Sobre
* Política de Privacidade
* Contato
* Desenvolvedor

---

# Fluxo do usuário

```text
Usuário entra
↓
Entende proposta
↓
Escolhe:
Ver mensagens
ou
Baixar app
```

---

# Tela 2 — Listagem Pública de Mensagens

## Objetivo

Permitir descoberta e consulta.

---

## Componentes

### Barra de busca

Busca por:

* título
* pregador
* igreja
* versículo

---

### Filtros laterais

Desktop:

Sidebar

Mobile:

Drawer

Filtros:

* pregador
* igreja
* tema
* data
* mais acessadas
* mais recentes

---

### Lista de cards

Cada card mostra:

* título
* pregador
* igreja
* data
* resumo curto
* botão “Ler”

---

## Empty State

```text
Nenhuma mensagem encontrada
Tente outro termo de busca
```

---

# Fluxo

```text
Usuário pesquisa
↓
Seleciona mensagem
↓
Abre detalhes
```

---

# Tela 3 — Página Pública da Mensagem

## Objetivo

Exibir a mensagem completa.

---

## Estrutura

### Cabeçalho

* título
* pregador
* igreja
* data
* versículo base

---

### Corpo principal

Seções:

* introdução
* pontos principais
* versículos secundários
* frases marcantes
* observações
* aplicações práticas
* conclusão
* resumo final

---

### Sidebar

Desktop:

* compartilhar
* copiar link
* mensagens relacionadas
* mais do mesmo pregador

Mobile:

fixado no rodapé

---

### CTA final

```text
Gostou desta mensagem?
Baixe o app Mensagem Transformadora
e registre suas próprias mensagens
```

---

# Fluxo

```text
Usuário lê mensagem
↓
Compartilha
↓
Conhece o app
```

---

# 5. Fluxo Administrativo

---

# Tela 4 — Login

## Objetivo

Autenticar usuário.

---

## Componentes

Campos:

* email
* senha

Botões:

```text
[ Entrar ]
[ Criar conta ]
[ Esqueci minha senha ]
```

Futuro:

```text
[ Entrar com Google ]
```

---

## Regras

Se login falhar:

```text
Email ou senha inválidos
```

---

# Fluxo

```text
Login
↓
Dashboard
```

---

# Tela 5 — Dashboard Admin

## Objetivo

Visão geral das publicações.

---

## Cards principais

* total de mensagens
* mensagens públicas
* mensagens privadas
* visualizações totais
* mensagens mais acessadas

---

## Gráficos

* publicações por mês
* visualizações por período
* pregadores mais frequentes
* igrejas mais frequentes

---

## CTA

```text
[ Gerenciar Mensagens ]
```

---

# Tela 6 — Minhas Mensagens

## Objetivo

Gerenciar publicações.

---

## Lista

Cada linha mostra:

* título
* status
* visibilidade
* views
* data
* ações rápidas

---

## Ações

```text
Editar
Copiar link
Despublicar
Excluir
```

---

## Filtros

* publicadas
* privadas
* rascunhos
* arquivadas

---

# Fluxo

```text
Seleciona mensagem
↓
Editar
ou
Despublicar
```

---

# Tela 7 — Editar Publicação

## Objetivo

Ajustar conteúdo publicado.

---

## Campos

Mesmos campos do app:

* título
* pregador
* igreja
* versículos
* pontos
* conclusão
* resumo

---

## Controles

```text
Visibilidade:
○ Pública
○ Privada
```

Botões:

```text
[ Salvar ]
[ Despublicar ]
[ Excluir ]
```

---

# Tela 8 — Perfil

## Objetivo

Gerenciar identidade ministerial.

---

## Campos

* nome público
* ministério
* igreja
* bio
* foto
* perfil público?

---

# Tela 9 — Configurações

## Objetivo

Configurações gerais.

---

## Itens

* alterar senha
* privacidade
* notificações futuras
* sair da conta

---

# 6. Fluxo App → Publicação Web

---

# Fluxo principal

```text
App Android
↓
Tela Detalhes
↓
Botão "Publicar no site"
↓
Verificação:
internet + login
↓
Tela de confirmação
↓
Escolher:
○ Pública
○ Privada
↓
Confirmar publicação
↓
Mensagem publicada
↓
Exibir:
Copiar link
Compartilhar
Atualizar publicação
```

---

# Modal de confirmação

Texto:

```text
Sua mensagem será enviada para a plataforma web.
Nada é publicado automaticamente.

Deseja continuar?
```

Botões:

```text
[ Cancelar ]
[ Publicar ]
```

---

# 7. Estados importantes

---

# Estado vazio

Exemplo:

```text
Você ainda não publicou nenhuma mensagem
```

CTA:

```text
Publicar primeira mensagem
```

---

# Estado de erro

Exemplo:

```text
Não foi possível publicar agora.
Verifique sua conexão e tente novamente.
```

---

# Estado de sucesso

Exemplo:

```text
Mensagem publicada com sucesso
```

CTA:

```text
Copiar link
Compartilhar
```

---

# Estado offline

Exemplo:

```text
Sem conexão com a internet

Sua mensagem continua salva localmente
e poderá ser publicada depois.
```

---

# 8. Componentes Reutilizáveis

---

## Cards

* sermon card
* dashboard card
* stats card

---

## Inputs

* busca
* filtros
* formulários

---

## Modais

* confirmação
* exclusão
* publicação
* despublicção

---

## Feedbacks

* toast success
* toast error
* skeleton loading
* empty states

---

# 9. Responsividade

---

# Desktop

Layout amplo

* sidebar
* dashboard completo
* SEO forte

---

# Mobile

Layout otimizado

* menu drawer
* sticky actions
* CTA fixo

---

# Tablet

Layout híbrido

---

# 10. UX Copy Guidelines

Sempre usar linguagem:

* simples
* acolhedora
* clara
* sem linguagem técnica
* com tom espiritual respeitoso

Exemplo:

```text
Sua mensagem foi publicada com sucesso
```

e não:

```text
Registro persistido com sucesso
```

---

# 11. Jornada Principal Ideal

```text
Usuário baixa app
↓
Cria mensagens
↓
Deseja compartilhar
↓
Publica no site
↓
Recebe link público
↓
Compartilha com outras pessoas
↓
Aumenta alcance ministerial
↓
Retorna ao app
↓
Cria novas mensagens
```

---


