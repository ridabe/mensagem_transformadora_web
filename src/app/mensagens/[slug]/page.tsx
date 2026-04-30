import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { buildSiteUrl } from "@/app/api/_shared/slug";
import { getDbPool } from "@/lib/db";
import { formatPtBrDate } from "@/lib/format";
import {
  incrementPublicSermonView,
} from "@/features/sermons/sermon.repository";
import type { PublishedSermon } from "@/features/sermons/sermon.types";
import { CopyLinkButton } from "./copy-link-button";

const PLAY_STORE_URL =
  "https://play.google.com/store/search?q=mensagem%20transformadora&c=apps";

type SermonPageProps = {
  params: Promise<{ slug: string }>;
};

function buildDescription(sermon: PublishedSermon): string {
  return `Mensagem ministrada por ${sermon.preacherName} na ${sermon.churchName}, baseada em ${sermon.mainVerse}.`;
}

async function getRuntimeBaseUrl(): Promise<string> {
  const configured = buildSiteUrl();
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

async function fetchPublicSermonBySlug(
  slug: string,
): Promise<PublishedSermon | null> {
  const base = await getRuntimeBaseUrl();
  const url = new URL(`/api/public/sermons/${encodeURIComponent(slug)}`, base);

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Falha ao buscar mensagem pública.");

  return (await res.json()) as PublishedSermon;
}

export async function generateMetadata({ params }: SermonPageProps) {
  const { slug } = await params;
  const sermon = await fetchPublicSermonBySlug(slug);
  if (!sermon) return {};

  const title = sermon.sermonTitle;
  const description =
    sermon.finalSummary?.trim() ||
    sermon.introduction?.trim() ||
    buildDescription(sermon);
  const urlPath = `/mensagens/${sermon.slug}`;
  const siteUrl = buildSiteUrl();
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
      locale: "pt_BR",
      siteName: "Mensagem Transformadora",
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

  const sermon = await fetchPublicSermonBySlug(slug);
  if (!sermon) notFound();

  const h = await headers();
  const viewerIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent");
  const referrer = h.get("referer");

  const siteUrl = buildSiteUrl() ?? (await getRuntimeBaseUrl());
  const shareUrl = `${siteUrl.replace(/\/+$/, "")}/mensagens/${sermon.slug}`;

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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 lg:px-0">
      <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <p className="inline-flex max-w-fit rounded-full bg-[#d0901c]/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#d0901c]">
              Mensagem pública
            </p>
            <div className="space-y-2">
              <p className="text-sm text-[var(--mt-muted)]">
                {sermon.preacherName} • {sermon.churchName} • {formatPtBrDate(new Date(sermon.sermonDate))}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--mt-text)] sm:text-4xl">
                {sermon.sermonTitle}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--mt-muted)]">
                Versículo base: <span className="font-medium text-[var(--mt-text)]">{sermon.mainVerse}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CopyLinkButton url={shareUrl} />
            <Link
              href="/mensagens"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] transition hover:bg-black/5"
            >
              Ver mais mensagens
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="flex flex-col gap-6">
          {sermon.finalSummary ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-[#d0901c]">Resumo rápido</p>
              <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[var(--mt-text)]">
                {sermon.finalSummary}
              </p>
            </section>
          ) : null}

          {sermon.introduction ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-lg font-semibold">Introdução</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-text)]">
                {sermon.introduction}
              </p>
            </section>
          ) : null}

          {sermon.keyPoints.length > 0 ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Pontos principais</h2>
                <span className="rounded-full bg-[#d0901c]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#d0901c]">
                  {sermon.keyPoints.length} itens
                </span>
              </div>
              <div className="mt-5 grid gap-4">
                {sermon.keyPoints.map((p) => (
                  <div key={p.id} className="rounded-[28px] border border-[var(--mt-border)] bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-[var(--mt-text)]">{p.title}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                      {p.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {sermon.secondaryVerses.length > 0 ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-lg font-semibold">Versículos secundários</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
                {sermon.secondaryVerses.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {sermon.highlightedPhrases.length > 0 ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-lg font-semibold">Frases marcantes</h2>
              <ul className="mt-4 space-y-3">
                {sermon.highlightedPhrases.map((phrase) => (
                  <li
                    key={phrase}
                    className="rounded-[28px] border border-[var(--mt-border)] bg-white p-4 text-sm text-[var(--mt-text)] shadow-sm"
                  >
                    “{phrase}”
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sermon.personalObservations ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-lg font-semibold">Observações pessoais</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                {sermon.personalObservations}
              </p>
            </section>
          ) : null}

          {sermon.practicalApplications ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-lg font-semibold">Aplicações práticas</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                {sermon.practicalApplications}
              </p>
            </section>
          ) : null}

          {sermon.conclusion ? (
            <section className="rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
              <h2 className="text-lg font-semibold">Conclusão</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mt-muted)]">
                {sermon.conclusion}
              </p>
            </section>
          ) : null}
        </article>

        <aside className="space-y-5">
          <div className="sticky top-24 space-y-4 rounded-[32px] border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6 shadow-sm">
            <h2 className="text-base font-semibold">Compartilhar</h2>
            <p className="text-sm text-[var(--mt-muted)]">
              Copie o link e compartilhe esta mensagem com sua comunidade.
            </p>
            <CopyLinkButton url={shareUrl} />
            <Link
              href="/mensagens"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] transition hover:bg-black/5"
            >
              Ver mais mensagens
            </Link>
          </div>

          <div className="rounded-[32px] border border-[var(--mt-border)] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[var(--mt-text)]">Gostou desta mensagem?</p>
            <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
              Baixe o app Mensagem Transformadora e registre suas próprias mensagens offline. Publique no site apenas quando quiser.
            </p>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Baixar App
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
