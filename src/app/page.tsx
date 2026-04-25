import Link from "next/link";

import { getPublicSermons } from "@/features/sermons/sermon.repository";
import { formatPtBrDate, truncateText } from "@/lib/format";

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
