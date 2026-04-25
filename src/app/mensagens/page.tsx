import Link from "next/link";
import { getPublicSermons } from "@/features/sermons/sermon.repository";
import { formatPtBrDate, truncateText } from "@/lib/format";

export const metadata = {
  title: "Mensagens públicas",
};

type PublicSermonsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  input: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = input?.[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

function toIntOrUndefined(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export default async function PublicSermonsPage({
  searchParams,
}: PublicSermonsPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const q = getStringParam(sp, "q")?.trim() || undefined;
  const page = toIntOrUndefined(getStringParam(sp, "page"));

  let result:
    | Awaited<ReturnType<typeof getPublicSermons>>
    | { items: []; page: number; pageSize: number; total: number };

  try {
    result = await getPublicSermons({ q, page });
  } catch {
    result = { items: [], page: page ?? 1, pageSize: 12, total: 0 };
  }

  const hasItems = result.items.length > 0;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < totalPages ? result.page + 1 : null;

  const baseQuery = (pageValue: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pageValue > 1) params.set("page", String(pageValue));
    return params.toString() ? `?${params.toString()}` : "";
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Mensagens públicas
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--mt-muted)]">
          Pesquise por título, pregador, igreja ou versículo. Nada é publicado
          automaticamente: só aparecem aqui mensagens enviadas pelo app.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título, pregador, igreja ou versículo…"
            className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
          >
            Buscar
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 lg:block">
          <h2 className="text-sm font-semibold">Filtros</h2>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Os filtros estarão disponíveis quando houver mensagens publicadas.
          </p>
        </aside>

        <div className="flex flex-col gap-4">
          {!hasItems ? (
            <div className="rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
              <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
              <p className="mt-2 text-sm text-[var(--mt-muted)]">
                Assim que uma mensagem for publicada no app, ela aparecerá na
                listagem pública.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Voltar para a Home
                </Link>
                <a
                  href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Baixar App
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/mensagens/${s.slug}`}
                    className="group rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 hover:border-[color:var(--mt-amber)]"
                  >
                    <p className="text-xs font-medium text-[var(--mt-muted)]">
                      {s.preacherName} • {s.churchName} •{" "}
                      {formatPtBrDate(new Date(s.sermonDate))}
                    </p>
                    <h2 className="mt-2 text-base font-semibold leading-6 group-hover:text-[var(--mt-navy)]">
                      {s.sermonTitle}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--mt-muted)]">
                      {truncateText(s.finalSummary ?? s.mainVerse, 140)}
                    </p>
                    <p className="mt-4 text-sm font-semibold text-[var(--mt-navy)]">
                      Ler mensagem
                    </p>
                  </Link>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--mt-muted)]">
                  Página {result.page} de {totalPages} • {result.total}{" "}
                  mensagens
                </p>
                <div className="flex items-center gap-2">
                  {prevPage ? (
                    <Link
                      href={`/mensagens${baseQuery(prevPage)}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Anterior
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-muted)] opacity-60">
                      Anterior
                    </span>
                  )}
                  {nextPage ? (
                    <Link
                      href={`/mensagens${baseQuery(nextPage)}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-4 text-sm font-semibold text-white hover:opacity-95"
                    >
                      Próxima
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-4 text-sm font-semibold text-white opacity-50">
                      Próxima
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
