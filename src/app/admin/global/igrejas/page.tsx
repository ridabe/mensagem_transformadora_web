import Link from "next/link";
import { formatPtBrDate } from "@/lib/format";
import { getAllChurches } from "@/app/admin/global/actions";
import { requireAdmin } from "@/lib/auth/profiles";

type SearchParamsType = {
  error?: string;
  saved?: string;
  id?: string;
};

type IgrejasPageProps = {
  searchParams?: Promise<SearchParamsType>;
};

function getErrorMessage(error: string | undefined): string | null {
  const messages: Record<string, string> = {
    name: "Nome da igreja é obrigatório",
    create: "Erro ao criar igreja",
    update: "Erro ao atualizar igreja",
    status: "Erro ao alterar status",
  };
  return error && error in messages ? messages[error] : null;
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        status === "active"
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
      }`}
    >
      {status === "active" ? "Ativa" : "Inativa"}
    </span>
  );
}

function PlanBadge({ planType }: { planType: string }) {
  const labels: Record<string, string> = {
    free: "Plano Free",
    basic: "Plano Básico",
    pro: "Plano Pro",
  };
  return (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
      {labels[planType] || planType}
    </span>
  );
}

export default async function AdminGlobalIgrejasPage({
  searchParams,
}: IgrejasPageProps) {
  await requireAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const error = getErrorMessage(sp?.error);
  const saved = sp?.saved === "1";

  let churches: Awaited<ReturnType<typeof getAllChurches>> = [];
  try {
    churches = await getAllChurches();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao carregar igrejas";
    console.error("Failed to load churches:", message);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Admin Global</h2>
          <p className="text-sm text-[var(--mt-muted)]">
            Gestão centralizada de igrejas
          </p>
        </div>
        <Link
          href="/admin/global/igrejas/nova"
          className="inline-flex items-center justify-center rounded-xl bg-[var(--mt-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Nova Igreja
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-200">
          Alterações salvas com sucesso!
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
        {churches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[var(--mt-muted)]">
              Nenhuma igreja registrada ainda
            </p>
            <Link
              href="/admin/global/igrejas/nova"
              className="mt-3 inline-flex text-sm font-semibold text-[var(--mt-primary)] hover:underline"
            >
              Criar primeira igreja
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--mt-border)] bg-[var(--mt-background)]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">
                  Nome
                </th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">
                  Localização
                </th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">
                  Plano
                </th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">
                  Criada em
                </th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mt-border)]">
              {churches.map((church) => (
                <tr
                  key={church.id}
                  className="hover:bg-[var(--mt-background)]"
                >
                  <td className="px-6 py-4 font-semibold text-[var(--mt-text)]">
                    {church.name}
                  </td>
                  <td className="px-6 py-4 text-[var(--mt-muted)]">
                    {church.city && church.state
                      ? `${church.city}, ${church.state}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <PlanBadge planType={church.plan_type} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={church.status} />
                  </td>
                  <td className="px-6 py-4 text-[var(--mt-muted)]">
                    {formatPtBrDate(new Date(church.created_at))}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/global/igrejas/${church.id}`}
                      className="font-semibold text-[var(--mt-primary)] hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {churches.length > 0 && (
        <div className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-muted)]">
          Total de {churches.length} igreja{churches.length !== 1 ? "s" : ""} registrada
          {churches.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
