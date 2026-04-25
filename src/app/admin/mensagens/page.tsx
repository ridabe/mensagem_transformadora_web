import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatPtBrDate } from "@/lib/format";

type AdminSermonRow = {
  id: string;
  sermon_title: string;
  status: string;
  visibility: string;
  views_count: number;
  sermon_date: string;
  slug: string;
};

export default async function AdminSermonsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=config");

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;
  const claimsRecord =
    claims && typeof claims === "object" ? (claims as Record<string, unknown>) : null;
  const userId = typeof claimsRecord?.sub === "string" ? claimsRecord.sub : null;
  if (!userId) redirect("/admin/login");

  const { data, error } = await supabase
    .from("published_sermons")
    .select("id,sermon_title,status,visibility,views_count,sermon_date,slug")
    .eq("user_id", userId)
    .order("sermon_date", { ascending: false })
    .limit(50);

  const rows = !error ? ((data ?? []) as AdminSermonRow[]) : [];

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Minhas mensagens</p>
        <h2 className="text-2xl font-semibold tracking-tight">Minhas mensagens</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Edite, despublique e copie links de suas publicações.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
          <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Assim que você publicar pelo app (ou pelo admin), suas mensagens
            aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
          <div className="grid grid-cols-1 gap-0 divide-y divide-[var(--mt-border)]">
            {rows.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--mt-muted)]">
                    {formatPtBrDate(new Date(s.sermon_date))} • {s.views_count} views •{" "}
                    {s.visibility} • {s.status}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold">{s.sermon_title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/mensagens/${s.slug}`}
                    className="text-sm font-semibold text-[var(--mt-navy)] hover:underline"
                  >
                    Abrir público
                  </Link>
                  <Link
                    href={`/admin/mensagens/${s.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

