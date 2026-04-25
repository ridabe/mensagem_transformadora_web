import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { getDbPool } from "@/lib/db";
import { formatPtBrDate } from "@/lib/format";
import {
  getPublicSermonBySlug,
  incrementPublicSermonView,
} from "@/features/sermons/sermon.repository";
import type { PublishedSermon } from "@/features/sermons/sermon.types";

const PLAY_STORE_URL =
  "https://play.google.com/store/search?q=mensagem%20transformadora&c=apps";

type SermonPageProps = {
  params: Promise<{ slug: string }>;
};

function buildDescription(sermon: PublishedSermon): string {
  return `Mensagem ministrada por ${sermon.preacherName} na ${sermon.churchName}, baseada em ${sermon.mainVerse}.`;
}

export async function generateMetadata({ params }: SermonPageProps) {
  const { slug } = await params;
  let sermon: PublishedSermon | null = null;
  try {
    sermon = await getPublicSermonBySlug(slug);
  } catch {
    return {};
  }
  if (!sermon) return {};

  const title = sermon.sermonTitle;
  const description = buildDescription(sermon);
  const urlPath = `/mensagens/${sermon.slug}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}${urlPath}` : urlPath;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicSermonPage({ params }: SermonPageProps) {
  const { slug } = await params;

  let sermon: PublishedSermon | null = null;
  try {
    sermon = await getPublicSermonBySlug(slug);
  } catch {
    sermon = null;
  }
  if (!sermon) notFound();

  const h = await headers();
  const viewerIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent");
  const referrer = h.get("referer");

  try {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await incrementPublicSermonView(client, sermon.id, {
        viewerIp,
        userAgent,
        referrer,
      });
    } finally {
      client.release();
    }
  } catch {
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 lg:flex-row lg:items-start lg:gap-8">
      <article className="w-full max-w-3xl">
        <header className="flex flex-col gap-3">
          <p className="text-sm text-[var(--mt-muted)]">
            {sermon.preacherName} • {sermon.churchName} •{" "}
            {formatPtBrDate(new Date(sermon.sermonDate))}
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {sermon.sermonTitle}
          </h1>
          <p className="text-sm text-[var(--mt-muted)]">
            Versículo base: <span className="font-medium">{sermon.mainVerse}</span>
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-6">
          {sermon.introduction ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Introdução</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-text)]">
                {sermon.introduction}
              </p>
            </section>
          ) : null}

          {sermon.keyPoints.length > 0 ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Pontos principais</h2>
              <div className="mt-4 flex flex-col gap-4">
                {sermon.keyPoints.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[var(--mt-border)] p-4">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                      {p.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {sermon.secondaryVerses.length > 0 ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Versículos secundários</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--mt-muted)]">
                {sermon.secondaryVerses.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {sermon.highlightedPhrases.length > 0 ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Frases marcantes</h2>
              <ul className="mt-3 space-y-3">
                {sermon.highlightedPhrases.map((phrase) => (
                  <li
                    key={phrase}
                    className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-muted)]"
                  >
                    “{phrase}”
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sermon.personalObservations ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Observações</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                {sermon.personalObservations}
              </p>
            </section>
          ) : null}

          {sermon.practicalApplications ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Aplicações práticas</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                {sermon.practicalApplications}
              </p>
            </section>
          ) : null}

          {sermon.conclusion ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Conclusão</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                {sermon.conclusion}
              </p>
            </section>
          ) : null}

          {sermon.finalSummary ? (
            <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-base font-semibold">Resumo final</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-text)]">
                {sermon.finalSummary}
              </p>
            </section>
          ) : null}
        </div>
      </article>

      <aside className="w-full max-w-md lg:sticky lg:top-24">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <h2 className="text-base font-semibold">Compartilhar</h2>
          <p className="text-sm text-[var(--mt-muted)]">
            Copie o link e compartilhe esta mensagem.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/mensagens"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Ver mais mensagens
            </Link>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <p className="text-sm font-medium">Gostou desta mensagem?</p>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Baixe o app Mensagem Transformadora e registre suas próprias mensagens
            offline. Publique no site apenas quando quiser.
          </p>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95 sm:w-auto"
          >
            Baixar App
          </a>
        </div>
      </aside>
    </main>
  );
}
