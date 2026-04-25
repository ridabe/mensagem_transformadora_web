PRD — Product Requirements Document
Plataforma Web — Mensagem Transformadora

1. Nome do Produto
Mensagem Transformadora — Plataforma Web

2. Objetivo do Produto
Expandir o ecossistema do aplicativo Android Mensagem Transformadora, permitindo que mensagens e sermões criados no app possam ser publicados, organizados, compartilhados e consultados através de uma plataforma web moderna, segura e escalável.
A plataforma web será responsável por transformar anotações privadas em conteúdos públicos (ou privados) com potencial de evangelização, compartilhamento e consulta histórica.

3. Problema que o Sistema Resolve
Hoje, o aplicativo Android permite registrar mensagens de pregação de forma organizada e offline, porém essas anotações permanecem exclusivamente no dispositivo do usuário.
Isso gera limitações como:


impossibilidade de compartilhar facilmente uma mensagem completa


dificuldade para consulta em navegador


ausência de histórico centralizado online


impossibilidade de publicar mensagens para outras pessoas


ausência de dashboard de publicações


falta de ambiente web para visualização e administração


A plataforma web resolve isso criando um ambiente de publicação e gestão de mensagens cristãs.

4. Público-Alvo
Usuários finais


membros de igreja


líderes de célula


obreiros


pastores


estudantes da Bíblia


pregadores


missionários


pessoas que gostam de registrar aprendizados espirituais


Institucional


igrejas


ministérios


células


pequenos grupos


departamentos de ensino bíblico



5. Proposta de Valor
A plataforma permitirá:


publicar mensagens criadas no app


compartilhar sermões por link público


organizar mensagens em ambiente web


acessar conteúdos via navegador


consultar mensagens antigas com rapidez


centralizar conteúdos ministeriais


criar histórico online de mensagens


manter controle entre conteúdo privado e público


ampliar o alcance espiritual através da internet



6. Estratégia do Produto
O app Android continua sendo:
ferramenta principal de criação
Responsável por:


criação


edição


PDF


backup


dashboard local


uso offline


A plataforma web será:
ferramenta principal de publicação e compartilhamento
Responsável por:


publicação online


consulta pública


painel administrativo


gestão de conteúdos publicados


compartilhamento por URL


SEO e indexação no Google



7. Requisitos de Negócio
Requisito Principal
O usuário deve conseguir publicar no site uma mensagem criada no aplicativo Android com apenas poucos cliques.

Requisitos Complementares


a publicação deve ser opcional


o app deve continuar funcionando 100% offline


nenhuma mensagem deve ser publicada automaticamente


o usuário deve controlar se a mensagem será pública ou privada


o usuário deve poder editar publicações posteriormente


o usuário deve poder despublicar mensagens


o sistema deve gerar uma URL única para cada mensagem publicada


o sistema deve permitir consulta pública das mensagens


o sistema deve possuir área administrativa protegida


o sistema deve permitir autenticação segura


o sistema deve possuir dashboard administrativo



8. Funcionalidades Principais

F1. Home Institucional
Objetivo
Ser a porta de entrada da plataforma web.
Deve conter


hero principal


chamada para ação


explicação sobre o produto


benefícios da plataforma


últimas mensagens publicadas


destaque para principais sermões


seção sobre o aplicativo


botão para baixar o app Android


área institucional sobre o projeto



F2. Publicação de Mensagem
Objetivo
Receber mensagens enviadas pelo app Android.
Regras


publicação iniciada pelo app


exige autenticação do usuário


validação obrigatória dos campos principais


criação automática de slug único


registro de data de publicação


controle de status:


publicada


privada


rascunho


despublicada





F3. Página Pública da Mensagem
Objetivo
Exibir o sermão em página pública própria.
URL
Exemplo:
/mensagem/o-poder-da-fe
Conteúdo exibido


título


pregador


igreja


data


versículo base


versículos secundários


introdução


pontos principais


frases marcantes


aplicações práticas


observações


conclusão


resumo final


Recursos


botão compartilhar


copiar link


SEO otimizado


página indexável no Google



F4. Listagem Pública de Mensagens
Objetivo
Permitir descoberta e consulta pública.
Recursos


listagem paginada


busca textual


filtros por:


pregador


igreja


versículo


tema


data




ordenação


destaque de mensagens recentes



F5. Área Administrativa
Objetivo
Permitir gestão completa das publicações.
Recursos


login seguro


dashboard administrativo


visualizar mensagens publicadas


editar publicação


despublicar


excluir


alterar visibilidade


copiar link público


acompanhar visualizações



F6. Dashboard Web
Objetivo
Exibir métricas de publicações.
Indicadores


total de mensagens publicadas


total de visualizações


mensagens mais acessadas


pregadores mais publicados


igrejas mais frequentes


publicações por período


mensagens privadas x públicas



F7. Perfil Ministerial (Futuro)
Objetivo
Criar uma identidade ministerial.
Recursos futuros


perfil público do usuário


perfil da igreja


agrupamento por ministério


histórico ministerial


timeline de mensagens



F8. Integração com App Android
Objetivo
Conectar o app com a plataforma web.
Recursos


botão “Publicar no site”


botão “Atualizar publicação”


botão “Despublicar”


status local de sincronização


retorno do link público


compartilhamento direto



9. Entidade Principal
Published Sermon
type PublishedSermon = {  id: string  localSermonId: string  userId: string  userName: string  preacherName: string  churchName: string  sermonDate: string  sermonTime?: string  sermonTitle: string  slug: string  mainVerse: string  secondaryVerses: string[]  introduction?: string  keyPoints: SermonPoint[]  highlightedPhrases: string[]  personalObservations?: string  practicalApplications?: string  conclusion?: string  finalSummary?: string  visibility: "public" | "private" | "draft"  publishStatus: "published" | "updated" | "unpublished"  viewsCount: number  publishedAt: string  updatedAt: string}

10. Regras Técnicas

Arquitetura Recomendada
Frontend Web
Next.js + TypeScript
Motivos:


SEO excelente


SSR


escalabilidade


performance


deploy simples na Vercel


ótima integração com Supabase



Backend + Banco
Supabase
Motivos:


PostgreSQL pronto


autenticação nativa


Row Level Security


Storage


escalabilidade


velocidade de desenvolvimento



11. Regras Não Funcionais

RNF01 — Segurança
Todas as áreas administrativas devem exigir autenticação.

RNF02 — Performance
As páginas públicas devem carregar rapidamente e possuir SEO otimizado.

RNF03 — Escalabilidade
A arquitetura deve permitir crescimento futuro sem refatoração estrutural.

RNF04 — Responsividade
A plataforma deve funcionar perfeitamente em:


desktop


tablet


mobile



RNF05 — Integridade
Nenhuma publicação pode comprometer os dados locais do app Android.

RNF06 — Privacidade
A publicação deve ser sempre opcional e controlada pelo usuário.

12. Roadmap de Desenvolvimento

Fase 1 — MVP Público


Home institucional


Listagem pública


Página individual da mensagem


SEO básico


Layout responsivo



Fase 2 — Backend de Publicação


Banco Supabase


APIs de publicação


autenticação


CRUD web



Fase 3 — Integração com App


botão publicar


login


sincronização


retorno de link público



Fase 4 — Painel Administrativo


dashboard


edição


despublicação


métricas



Fase 5 — Expansão


perfil ministerial


perfis de igreja


favoritos públicos


ranking de mensagens


recomendação de conteúdos



13. Visão Final do Produto
O objetivo final é transformar o Mensagem Transformadora em um ecossistema completo:
App Android
para registrar
Plataforma Web
para publicar
Futuro SaaS Ministerial
para escalar
transformando anotações simples em um acervo espiritual acessível, organizado e compartilhável.