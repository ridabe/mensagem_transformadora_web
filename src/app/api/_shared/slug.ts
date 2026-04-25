function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildSiteUrl(): string | null {
  const url =
    process.env.URL_SITE ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL;
  if (!url) return null;

  const normalized = url.startsWith("http") ? url : `https://${url}`;
  return normalized.replace(/\/+$/, "");
}

export function buildPublicSermonUrl(slug: string): string {
  const base = buildSiteUrl();
  if (!base) return `/mensagens/${slug}`;
  return `${base}/mensagens/${slug}`;
}

export function buildSlugCandidates(title: string, maxAttempts = 20): string[] {
  const baseRaw = slugify(title);
  const base = baseRaw || "mensagem";
  const candidates: string[] = [base];
  for (let i = 2; i <= maxAttempts; i++) {
    candidates.push(`${base}-${i}`);
  }
  return candidates;
}

