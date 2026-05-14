import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import planoFreeImage from "../../img/plano_free.png";
import planoBasicoImage from "../../img/plano_basico.png";
import planoProImage from "../../img/plano_pro.png";
import arteBlogImage from "../../img/arte_blog.png";
import { buildSiteUrl } from "@/app/api/_shared/slug";

export const metadata: Metadata = {
  title: "Organize sua Pregação — Mensagem Transformadora para Pastores e Líderes",
  description:
    "A plataforma que pastores e líderes usam para organizar anotações de pregação, versículos e mensagens da Palavra. Escreva, revise e publique sua mensagem com total controle.",
};

export default async function HomePage() {
  const siteUrl = buildSiteUrl() ?? "https://mensagem-transformadora-web.vercel.app";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Mensagem Transformadora",
      description: "Plataforma para pastores e líderes organizarem pregação, anotações e mensagens da Palavra de Deus. Escreva, revise e publique sua mensagem com total controle.",
      applicationCategory: "ReligiousApplication",
      operatingSystem: "Android",
      url: siteUrl,
      downloadUrl: "https://play.google.com/store/search?q=mensagem%20transformadora&c=apps",
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
      publisher: { "@type": "Organization", name: "Mensagem Transformadora", url: siteUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Mensagem Transformadora",
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
      sameAs: ["https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Mensagem Transformadora",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/blog?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
  return (
    <main className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── HERO — âncora Z: topo-esquerdo H1 → topo-direito card ── */}
      <section className="relative overflow-hidden bg-[var(--mt-navy)] text-white">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top_right,rgba(245,200,66,0.18),transparent_30%),radial-gradient(circle_at_30%_20%,rgba(36,54,96,0.12),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,39,68,0.92)_20%,rgba(26,39,68,0.82)_100%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:py-24 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">

            {/* Coluna esquerda — âncora topo-esquerdo do Z */}
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/80">
                Plataforma web para pregadores • App para a congregação
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Organize sua pregação na web e deixe a congregação anotar no app
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Registre versículos e pontos da mensagem na plataforma, gere um ID e compartilhe com a congregação.
                No app, os dados são preenchidos automaticamente — cada ouvinte anota livremente durante a pregação.
              </p>
              {/* CTAs em 1ª pessoa — âncora diagonal do Z */}
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/mensagens"
                  className="btn btn-primary btn-lg inline-flex cursor-pointer"
                >
                  Quero explorar mensagens
                </Link>
                <a
                  href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-lg inline-flex cursor-pointer"
                >
                  Baixar meu app
                </a>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="h-3.5 w-3.5 shrink-0 text-[var(--mt-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Acesso gratuito · Sem cadastro obrigatório para explorar
              </p>
              {/* Cartões de confiança — Gestalt: agrupados próximos às CTAs */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Controle total",
                    detail: "Publicação feita por você, quando estiver pronto.",
                  },
                  {
                    label: "Foco na mensagem",
                    detail: "Estruture versículo, pontos e aplicações com clareza.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-300/80">{item.label}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna direita — âncora topo-direito do Z */}
            <div className="space-y-6">
              <div className="rounded-[var(--mt-radius-2xl)] border border-white/10 bg-white/5 p-8 shadow-[0_46px_80px_-64px_rgba(255,255,255,0.34)] backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300/80">
                  Uma experiência para pregadores e ouvintes
                </p>
                <h2 className="mt-4 text-3xl font-semibold text-white">Web para criar. App para anotar.</h2>
                <div className="mt-8 space-y-4">
                  {[
                    {
                      tag: "Na web",
                      title: "Crie e publique a mensagem",
                      description: "Cadastre versículo-chave, versículos adicionais e pontos da pregação. A plataforma gera um ID exclusivo para cada mensagem.",
                    },
                    {
                      tag: "No app",
                      title: "Congregação anota com o ID",
                      description: "Ao informar o ID no app, os versículos são preenchidos automaticamente. O ouvinte anota livremente durante a pregação.",
                    },
                    {
                      tag: "No app",
                      title: "Salva no celular ou exporta PDF",
                      description: "As anotações ficam guardadas no dispositivo ou podem ser exportadas em PDF para compartilhar com outras pessoas.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300/80 mb-2">
                        {item.tag}
                      </span>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Planos para líderes", value: "Free, Básico e Pro" },
                  { label: "Acesso imediato", value: "Cadastro e uso imediato" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-[var(--mt-night)]/80 p-6"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400/80">{item.label}</p>
                    <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA — Z stroke 2: passos à ESQUERDA, descrição à DIREITA ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[var(--mt-radius-3xl)] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 shadow-[0_24px_60px_-50px_rgba(0,0,0,0.7)] sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">

            {/* Passos — esquerda no desktop, abaixo no mobile (order) */}
            <div className="grid gap-4 sm:grid-cols-2 order-2 lg:order-1">
              {[
                {
                  step: "1",
                  title: "Crie a mensagem na web",
                  description: "Cadastre o versículo-chave e versículos adicionais na plataforma. O sistema gera um ID exclusivo para a pregação.",
                },
                {
                  step: "2",
                  title: "Compartilhe o ID",
                  description: "Informe o ID para a congregação antes da pregação. No app, os dados da mensagem são preenchidos automaticamente.",
                },
                {
                  step: "3",
                  title: "Congregação anota no app",
                  description: "Cada ouvinte acompanha com os versículos já disponíveis e faz suas anotações livremente durante a pregação.",
                },
                {
                  step: "4",
                  title: "Salve, exporte ou publique",
                  description: "As anotações ficam no celular ou são exportadas em PDF. O pregador publica a mensagem na web quando quiser.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[var(--mt-radius-xl)] border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] p-6 shadow-sm"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mt-gold)]/10 text-lg font-semibold text-[var(--mt-gold)]">
                    {item.step}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-[var(--mt-text)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Descrição — direita no desktop, acima no mobile */}
            <div className="space-y-4 order-1 lg:order-2">
              <p className="inline-flex max-w-fit rounded-full bg-[var(--mt-gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--mt-gold)]">
                Como funciona
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--mt-text)] sm:text-4xl">
                Um fluxo do pregador para a congregação
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[var(--mt-muted)] sm:text-base">
                O <strong className="text-[var(--mt-text)]">pregador cria na plataforma web</strong> e gera um ID.
                A <strong className="text-[var(--mt-text)]">congregação usa o ID no app</strong> — versículos preenchidos automaticamente, espaço livre para anotar, tudo salvo no celular.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--mt-gold)]">Planos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--mt-text)]">
              Escolha o plano ideal para seu ministério
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--mt-muted)]">
              Tenha previsibilidade e recursos alinhados ao ritmo da sua criação de conteúdo pastoral.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <Link href="/cadastro" className="btn btn-secondary btn-lg inline-flex cursor-pointer">
              Criar minha conta grátis
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-[var(--mt-muted)]">
              <svg className="h-3.5 w-3.5 shrink-0 text-[var(--mt-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Sem cartão de crédito · Comece em segundos
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Plano Free",
              subtitle: "Comece sem pagar",
              description:
                "Acesso a 10 pré-sermões por mês para você testar o fluxo completo de pregação.",
              highlight: "10 pré-sermões/mês",
              image: planoFreeImage,
            },
            {
              title: "Plano Básico",
              subtitle: "Mais espaço para crescer",
              description:
                "Organize sua rotina pastoral e crie até 20 pré-sermões por mês.",
              highlight: "20 pré-sermões/mês",
              image: planoBasicoImage,
            },
            {
              title: "Plano Pro",
              subtitle: "Sem limites para criar",
              description:
                "Pré-sermões ilimitados para pastores e líderes focados no preparo da mensagem.",
              highlight: "Pré-sermões ilimitados",
              image: planoProImage,
              badge: "Recomendado",
            },
          ].map((plan) => (
            <Link
              key={plan.title}
              href="/cadastro"
              className="group overflow-hidden rounded-[var(--mt-radius-2xl)] border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] p-6 transition hover:-translate-y-1 cursor-pointer"
              style={{ boxShadow: 'var(--mt-shadow-lg)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--mt-text-secondary)]">
                    {plan.subtitle}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-[var(--mt-text)]">{plan.title}</h3>
                </div>
                {plan.badge ? (
                  <span className="rounded-full bg-[var(--mt-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--mt-navy)]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--mt-border)] bg-[var(--mt-surface-muted)]">
                <Image src={plan.image} alt={plan.title} className="h-auto w-full" sizes="100vw" />
              </div>
              <p className="mt-6 text-sm leading-6 text-[var(--mt-text-secondary)]">{plan.description}</p>
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--mt-text-secondary)]">
                  {plan.highlight}
                </span>
                <span className="text-sm font-semibold text-[var(--mt-text-secondary)] underline-offset-2 transition group-hover:text-[var(--mt-gold)] group-hover:underline">
                  Quero este plano
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--mt-text-secondary)]">
                <svg className="h-3 w-3 shrink-0 text-[var(--mt-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Cadastro gratuito · Cancele quando quiser
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BLOG ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div
          className="rounded-[var(--mt-radius-2xl)] border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] p-8"
          style={{ boxShadow: "var(--mt-shadow-xl)" }}
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--mt-gold)]">
                BLOG
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--mt-text)] sm:text-3xl">
                Reflexões e conteúdos para fortalecer sua caminhada
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--mt-text-secondary)] sm:text-base">
                Acesse artigos e mensagens com leitura agradável, posts em destaque, categorias e tags — um blog completo
                para você aprofundar e compartilhar.
              </p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <Link href="/blog" className="btn btn-primary btn-lg inline-flex cursor-pointer">
                  Acessar o Blog
                </Link>
                <Link href="/mensagens" className="btn btn-ghost btn-lg inline-flex cursor-pointer">
                  Ver mensagens públicas
                </Link>
              </div>
            </div>

            <Link
              href="/blog"
              className="group overflow-hidden rounded-[var(--mt-radius-2xl)] border border-[var(--mt-border)] bg-[var(--mt-surface-muted)] transition hover:-translate-y-1"
              style={{ boxShadow: "var(--mt-shadow-lg)" }}
            >
              <Image
                src={arteBlogImage}
                alt="Acessar o Blog"
                className="h-auto w-full"
                sizes="(max-width: 1024px) 100vw, 480px"
              />
              <div className="flex items-center justify-between gap-4 border-t border-[var(--mt-border)] px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--mt-text)]">Blog Mensagem Transformadora</p>
                  <p className="mt-1 text-sm text-[var(--mt-text-secondary)]">
                    Clique na imagem para entrar
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--mt-text-secondary)] underline-offset-2 transition group-hover:text-[var(--mt-gold)] group-hover:underline">
                  Abrir
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── COMUNIDADE ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div
          className="rounded-[var(--mt-radius-2xl)] border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] p-10"
          style={{ boxShadow: 'var(--mt-shadow-xl)' }}
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--mt-gold)]">
                NOVIDADE
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--mt-text)]">
                Descubra mensagens e pregações compartilhadas pela comunidade
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--mt-text-secondary)]">
                Explore palavras e reflexões publicadas por pastores e líderes de todo o Brasil,
                organizadas de forma clara para facilitar a leitura, o aprofundamento e o compartilhamento da Palavra.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/mensagens" className="btn btn-primary btn-lg inline-flex cursor-pointer">
                  Quero explorar a Palavra
                </Link>
                <a
                  href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-lg inline-flex cursor-pointer"
                >
                  Baixar meu app
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Conteúdo pastoral",
                  description: "Cada mensagem ganha espaço de leitura com resumo e contexto claro.",
                },
                {
                  title: "Blocos temáticos",
                  description: "Seções visualmente separadas tornam a navegação mais leve e organizada.",
                },
                {
                  title: "Design inspirador",
                  description: "Cartões elegantes que valorizam o conteúdo de cada pastor e líder.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-[var(--mt-border)] bg-[var(--mt-surface-muted)] p-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--mt-text-secondary)]">{item.title}</p>
                  <p className="mt-4 text-sm leading-6 text-[var(--mt-text-secondary)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
