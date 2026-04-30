import Link from "next/link";
import Image from "next/image";

import planoFreeImage from "../../img/plano_free.png";
import planoBasicoImage from "../../img/plano_basico.png";
import planoProImage from "../../img/plano_pro.png";

export default async function HomePage() {

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-[var(--mt-navy)] text-white">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top_right,rgba(245,200,66,0.18),transparent_30%),radial-gradient(circle_at_30%_20%,rgba(36,54,96,0.12),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,39,68,0.92)_20%,rgba(26,39,68,0.82)_100%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:py-24 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/80">
                100% offline no app • publicação opcional
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Transforme suas anotações de pregação em mensagens organizadas e compartilháveis
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Crie suas mensagens no app offline, gerencie pré-sermões com segurança e publique na web apenas quando quiser.
                Um fluxo moderno pensado para líderes que desejam controle, clareza e impacto.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/mensagens"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--mt-gold)] px-7 text-sm font-semibold text-[var(--mt-navy)] transition hover:brightness-95"
                >
                  Ver mensagens
                </Link>
                <a
                  href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Baixar App
                </a>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Controle total",
                    detail: "Publicação feita por você, quando estiver pronto.",
                  },
                  {
                    label: "Foco no conteúdo",
                    detail: "Estruture verso, pontos e aplicações com clareza.",
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

            <div className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_46px_80px_-64px_rgba(255,255,255,0.34)] backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300/80">
                  Fluxo pensado para líderes
                </p>
                <h2 className="mt-4 text-3xl font-semibold text-white">Organize, publique e compartilhe</h2>
                <div className="mt-8 space-y-6">
                  {[
                    {
                      title: "Offline-first",
                      description: "Crie e edite sem conexão e sincronize quando estiver pronto.",
                    },
                    {
                      title: "Publicação opcional",
                      description: "Escolha o que vai ao site e mantenha privacidade para o restante.",
                    },
                    {
                      title: "Link exclusivo",
                      description: "Cada mensagem ganha URL própria, pronta para compartilhar.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Planos pensados para líderes", value: "Free, Básico e Pro" },
                  { label: "Acesso rápido", value: "Cadastro e uso imediato" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-[#071028]/80 p-6"
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

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="rounded-[32px] border border-slate-200/10 bg-white shadow-xl shadow-slate-900/5 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--mt-gold)]">Como funciona</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              Um fluxo organizado em três passos
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Crie no app offline, revise na área de líder e publique apenas quando desejar.
              Cada etapa foi pensada para reduzir atrito e manter o foco no conteúdo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                step: "1",
                title: "Crie no app",
                description: "Anote versículo, pontos e conclusão mesmo sem internet.",
              },
              {
                step: "2",
                title: "Revise no líder",
                description: "Administre pré-sermões e acompanhe o progresso.",
              },
              {
                step: "3",
                title: "Publique quando quiser",
                description: "Venda o conteúdo com URL própria e controle total.",
              },
              {
                step: "4",
                title: "Acompanhe resultados",
                description: "Veja quantas pessoas acessaram sua mensagem.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[28px] border border-slate-200/10 bg-slate-50 p-6 shadow-sm">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mt-gold)]/10 text-lg font-semibold text-[var(--mt-gold)]"> 
                  {item.step}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--mt-gold)]">Planos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Escolha o plano ideal para seu ministério
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Tenha previsibilidade e recursos alinhados ao ritmo da sua criação de conteúdo.
            </p>
          </div>
          <Link
            href="/cadastro"
            className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--mt-navy)] px-6 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Criar conta
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Plano Free",
              subtitle: "Comece sem pagar",
              description:
                "Acesso a 10 pré-sermões por mês para você testar o fluxo completo.",
              highlight: "10 pré-sermões/mês",
              image: planoFreeImage,
            },
            {
              title: "Plano Básico",
              subtitle: "Mais espaço para crescer",
              description:
                "Organize sua rotina e crie até 20 pré-sermões por mês.",
              highlight: "20 pré-sermões/mês",
              image: planoBasicoImage,
            },
            {
              title: "Plano Pro",
              subtitle: "Sem limites para criar",
              description:
                "Pré-sermões ilimitados para líderes focados no preparo da mensagem.",
              highlight: "Pré-sermões ilimitados",
              image: planoProImage,
              badge: "Recomendado",
            },
          ].map((plan) => (
            <Link
              key={plan.title}
              href="/cadastro"
              className="group overflow-hidden rounded-[32px] border border-slate-200/90 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    {plan.subtitle}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-900">{plan.title}</h3>
                </div>
                {plan.badge ? (
                  <span className="rounded-full bg-[var(--mt-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--mt-navy)]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-100">
                <Image src={plan.image} alt={plan.title} className="h-auto w-full" sizes="100vw" />
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-600">{plan.description}</p>
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {plan.highlight}
                </span>
                <span className="text-sm font-semibold text-[var(--mt-navy)] transition group-hover:text-[var(--mt-gold)]">
                  Escolher
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-slate-200/90 bg-white p-10 shadow-xl shadow-slate-900/5">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--mt-gold)]">
                NOVIDADE
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                Acompanhe as mensagens compartilhadas pela nossa comunidade
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Explore palavras e reflexões publicados por pessoas de todo o Brasil, organizados de forma clara para facilitar a leitura, o aprofundamento e o compartilhamento da Palavra.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/mensagens"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-[var(--mt-navy)] px-7 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Ver publicações
                </Link>
                <a
                  href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Baixar App
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Conteúdo editorial",
                  description: "Cada mensagem ganha espaço de leitura com resumidos e contexto claro.",
                },
                {
                  title: "Blocos temáticos",
                  description: "Seções visualmente separadas tornam a navegação mais leve e organizada.",
                },
                {
                  title: "Design inspirador",
                  description: "Cartões elegantes e modernos que valorizam o conteúdo do líder.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200/90 bg-slate-50 p-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.title}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
