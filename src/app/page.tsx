import Link from "next/link";
import Image from "next/image";

import { getPublicSermons } from "@/features/sermons/sermon.repository";
import { formatPtBrDate, truncateText } from "@/lib/format";

import planoFreeImage from "../../img/plano_free.png";
import planoBasicoImage from "../../img/plano_basico.png";
import planoProImage from "../../img/plano_pro.png";

export default async function HomePage() {
  let latest:
    | Awaited<ReturnType<typeof getPublicSermons>>["items"]
    | [];

  try {
    const res = await getPublicSermons({ page: 1, pageSize: 6 });
    latest = res.items;
  } catch {
    latest = [];
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_20%,rgba(208,144,28,0.22),transparent_60%),radial-gradient(60%_60%_at_30%_10%,rgba(11,33,74,0.22),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 py-1 text-xs font-medium text-[var(--mt-muted)]">
              100% offline no app • publicação opcional e controlada por você
            </p>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-[var(--mt-text)] sm:text-5xl">
              Transforme suas anotações de pregação em mensagens organizadas e
              compartilháveis
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--mt-muted)]">
              Crie suas mensagens no app (offline-first) e publique no site
              apenas quando desejar. Nenhuma mensagem é publicada
              automaticamente.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/mensagens"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--mt-navy)] px-6 text-sm font-semibold text-white hover:opacity-95"
              >
                Ver mensagens
              </Link>
              <a
                href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-6 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Baixar App
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Planos</h2>
            <p className="mt-2 text-sm text-[var(--mt-muted)]">
              Escolha o plano ideal e comece a criar seus pré-sermões hoje mesmo.
            </p>
          </div>
          <Link
            href="/cadastro"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            Criar conta
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Plano Free",
              subtitle: "Comece sem pagar",
              description:
                "Acesso a 10 pré-sermões por mês para você testar o fluxo completo e organizar suas mensagens.",
              highlight: "10 pré-sermões/mês",
              image: planoFreeImage,
            },
            {
              title: "Plano Básico",
              subtitle: "Mais espaço para crescer",
              description:
                "Ideal para quem quer constância: organize sua rotina e crie até 20 pré-sermões por mês.",
              highlight: "20 pré-sermões/mês",
              image: planoBasicoImage,
            },
            {
              title: "Plano Pro",
              subtitle: "Sem limites para criar",
              description:
                "Para líderes que querem ir além: pré-sermões ilimitados e foco total no preparo da mensagem.",
              highlight: "Pré-sermões ilimitados",
              image: planoProImage,
              badge: "Recomendado",
            },
          ].map((plan) => (
            <Link
              key={plan.title}
              href="/cadastro"
              className="group relative overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] transition hover:-translate-y-0.5 hover:border-[color:var(--mt-amber)]"
            >
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[color:var(--mt-amber)]/10 blur-2xl" />
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[color:var(--mt-navy)]/10 blur-2xl" />
              </div>

              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mt-muted)]">
                      {plan.subtitle}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">
                      {plan.title}
                    </h3>
                  </div>
                  {plan.badge ? (
                    <span className="shrink-0 rounded-full bg-[color:var(--mt-amber)] px-3 py-1 text-xs font-semibold text-black">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-[var(--mt-border)] bg-black/[0.02] dark:bg-white/[0.03]">
                  <Image
                    src={plan.image}
                    alt={plan.title}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                    className="h-auto w-full"
                    priority={plan.title === "Plano Free"}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-[var(--mt-muted)]">
                  {plan.description}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 py-1 text-xs font-semibold">
                    {plan.highlight}
                  </span>
                  <span className="text-sm font-semibold text-[var(--mt-navy)] group-hover:underline">
                    Ir para cadastro
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <h2 className="text-xl font-semibold tracking-tight">Benefícios</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Offline-first",
              desc: "Crie e organize suas mensagens no app, sem depender de internet.",
            },
            {
              title: "Publicação opcional",
              desc: "Você decide o que vai para o site e quando publicar.",
            },
            {
              title: "Compartilhamento por link",
              desc: "Envie sua mensagem completa com uma URL única.",
            },
            {
              title: "Organização espiritual",
              desc: "Estrutura clara: versículos, pontos, frases e resumo final.",
            },
            {
              title: "SEO e leitura premium",
              desc: "Página pública otimizada para leitura e descoberta.",
            },
            {
              title: "Histórico ministerial",
              desc: "Construa um acervo online com controle de visibilidade.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Últimas mensagens publicadas
            </h2>
            <p className="mt-2 text-sm text-[var(--mt-muted)]">
              Mensagens publicadas recentemente pelo app.
            </p>
          </div>
          <Link
            href="/mensagens"
            className="hidden text-sm font-medium text-[var(--mt-navy)] hover:underline sm:inline"
          >
            Ver todas
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
            <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
            <p className="mt-2 text-sm text-[var(--mt-muted)]">
              Publique uma mensagem no app para gerar um link compartilhável.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((s) => (
              <Link
                key={s.id}
                href={`/mensagens/${s.slug}`}
                className="group rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 hover:border-[color:var(--mt-amber)]"
              >
                <p className="text-xs font-medium text-[var(--mt-muted)]">
                  {s.preacherName} • {s.churchName} •{" "}
                  {formatPtBrDate(new Date(s.sermonDate))}
                </p>
                <h3 className="mt-2 text-base font-semibold leading-6 group-hover:text-[var(--mt-navy)]">
                  {s.sermonTitle}
                </h3>
                <p className="mt-2 text-sm text-[var(--mt-muted)]">
                  {truncateText(s.finalSummary ?? s.mainVerse, 120)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
