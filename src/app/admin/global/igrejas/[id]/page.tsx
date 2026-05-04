import Link from "next/link";
import { formatPtBrDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/profiles";
import {
  getChurchById,
  getChurchUsers,
  updateChurchAction,
  toggleChurchStatusAction,
  type ChurchRow,
} from "@/app/admin/global/actions";

type IdPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function getErrorMessage(error: string | undefined): string | null {
  const messages: Record<string, string> = {
    name: "Nome da igreja é obrigatório",
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

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    admin: {
      bg: "bg-violet-100 dark:bg-violet-900/30",
      text: "text-violet-800 dark:text-violet-300",
    },
    leader: {
      bg: "bg-sky-100 dark:bg-sky-900/30",
      text: "text-sky-800 dark:text-sky-300",
    },
  };

  const color = colors[role] || colors.leader;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color.bg} ${color.text}`}
    >
      {role === "admin" ? "Admin" : "Líder"}
    </span>
  );
}

export default async function AdminGlobalChurchDetailsPage({
  params,
  searchParams: searchParamsPromise,
}: IdPageProps) {
  await requireAdmin();

  const { id } = await params;
  const searchParams = searchParamsPromise ? await searchParamsPromise : undefined;
  const error = getErrorMessage(getString(searchParams, "error"));
  const saved = getString(searchParams, "saved") === "1";

  let church: ChurchRow | null = null;
  let users: Awaited<ReturnType<typeof getChurchUsers>> = [];

  try {
    church = await getChurchById(id);
    if (church) {
      users = await getChurchUsers(id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar dados";
    console.error("Failed to load church details:", message);
  }

  if (!church) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
          <p className="text-sm text-[var(--mt-muted)]">Igreja não encontrada</p>
          <Link
            href="/admin/global/igrejas"
            className="mt-3 inline-flex text-sm font-semibold text-[var(--mt-primary)] hover:underline"
          >
            Voltar para igrejas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{church.name}</h2>
          <p className="text-sm text-[var(--mt-muted)]">
            Detalhes e gestão da igreja
          </p>
        </div>
        <Link
          href="/admin/global/igrejas"
          className="inline-flex text-sm font-semibold text-[var(--mt-primary)] hover:underline"
        >
          ← Voltar
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

      {/* Status Overview */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
          <p className="text-xs text-[var(--mt-muted)]">Status</p>
          <div className="mt-2">
            <StatusBadge status={church.status} />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
          <p className="text-xs text-[var(--mt-muted)]">Plano</p>
          <div className="mt-2">
            <PlanBadge planType={church.plan_type} />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
          <p className="text-xs text-[var(--mt-muted)]">Usuários</p>
          <p className="mt-2 text-xl font-bold">{users.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
          <p className="text-xs text-[var(--mt-muted)]">Criada em</p>
          <p className="mt-2 text-sm font-semibold">
            {formatPtBrDate(new Date(church.created_at))}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <form action={updateChurchAction} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={church.id} />

        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <h3 className="mb-6 text-lg font-semibold">Informações Básicas</h3>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="name"
                className="text-sm font-semibold text-[var(--mt-text)]"
              >
                Nome da Igreja *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={church.name}
                required
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm outline-none focus:border-[var(--mt-primary)]"
              />
            </div>

            {/* City */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="city"
                className="text-sm font-semibold text-[var(--mt-text)]"
              >
                Cidade
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={church.city || ""}
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm outline-none focus:border-[var(--mt-primary)]"
              />
            </div>

            {/* State */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="state"
                className="text-sm font-semibold text-[var(--mt-text)]"
              >
                Estado (UF)
              </label>
              <input
                id="state"
                name="state"
                type="text"
                defaultValue={church.state || ""}
                maxLength={2}
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm uppercase outline-none focus:border-[var(--mt-primary)]"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="status"
                className="text-sm font-semibold text-[var(--mt-text)]"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={church.status}
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm outline-none focus:border-[var(--mt-primary)]"
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>
          </div>

          {/* Business Notes */}
          <div className="mt-6 flex flex-col gap-2">
            <label
              htmlFor="business_notes"
              className="text-sm font-semibold text-[var(--mt-text)]"
            >
              Observações Administrativas
            </label>
            <textarea
              id="business_notes"
              name="business_notes"
              rows={3}
              placeholder="Ex: Notas sobre a situação da igreja, planos futuros, etc."
              defaultValue={church.business_notes || ""}
              className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm outline-none focus:border-[var(--mt-primary)]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--mt-primary)] px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Salvar Alterações
          </button>
          <form action={toggleChurchStatusAction} className="contents">
            <input type="hidden" name="id" value={church.id} />
            <input
              type="hidden"
              name="new_status"
              value={church.status === "active" ? "inactive" : "active"}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-6 py-2 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              {church.status === "active" ? "Desativar" : "Ativar"}
            </button>
          </form>
        </div>
      </form>

      {/* Users Section */}
      <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="mb-6 text-lg font-semibold">Usuários Associados</h3>

        {users.length === 0 ? (
          <p className="text-sm text-[var(--mt-muted)]">
            Nenhum usuário associado a esta igreja
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--mt-border)] bg-[var(--mt-background)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">
                    Função
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">
                    Papel
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mt-border)]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--mt-background)]">
                    <td className="px-4 py-4 font-semibold text-[var(--mt-text)]">
                      {user.display_name}
                    </td>
                    <td className="px-4 py-4 text-[var(--mt-muted)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-4 text-[var(--mt-muted)]">
                      {user.ministry_title || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-4 text-[var(--mt-muted)]">
                      {formatPtBrDate(new Date(user.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
