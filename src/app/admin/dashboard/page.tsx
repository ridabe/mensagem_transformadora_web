import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type DashboardSummaryRow = {
  user_id: string;
  total_sermons: number;
  total_published: number;
  total_private: number;
  total_unpublished: number;
  total_views: number;
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Configuração</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          para habilitar autenticação e o painel.
        </p>
      </main>
    );
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;
  const claimsRecord =
    claims && typeof claims === "object" ? (claims as Record<string, unknown>) : null;
  const userId = typeof claimsRecord?.sub === "string" ? claimsRecord.sub : null;
  if (!userId) redirect("/admin/login");

  const { data, error } = await supabase
    .from("sermon_dashboard_summary")
    .select(
      "user_id,total_sermons,total_published,total_private,total_unpublished,total_views",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar os dados do painel.
        </p>
      </main>
    );
  }

  const summary: DashboardSummaryRow = (data as DashboardSummaryRow | null) ?? {
    user_id: userId,
    total_sermons: 0,
    total_published: 0,
    total_private: 0,
    total_unpublished: 0,
    total_views: 0,
  };

  const cards = [
    { label: "Mensagens", value: summary.total_sermons },
    { label: "Públicas", value: summary.total_published },
    { label: "Privadas", value: summary.total_private },
    { label: "Despublicadas", value: summary.total_unpublished },
    { label: "Visualizações", value: summary.total_views },
  ];

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Dashboard</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Visão geral das publicações
        </h2>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5"
          >
            <p className="text-xs font-medium text-[var(--mt-muted)]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <p className="text-sm text-[var(--mt-muted)]">
          Próximo passo: /admin/mensagens para gerenciar suas publicações.
        </p>
      </section>
    </main>
  );
}
