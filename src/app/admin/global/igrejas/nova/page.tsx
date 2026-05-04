import Link from "next/link";
import { requireAdmin } from "@/lib/auth/profiles";
import { createChurchAction } from "@/app/admin/global/actions";

export default async function AdminGlobalNovaIgrejaPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
        <h2 className="text-xl font-bold tracking-tight">Nova Igreja</h2>
        <p className="text-sm text-[var(--mt-muted)]">
          Registre uma nova igreja no sistema
        </p>
      </div>

      {/* Form */}
      <form action={createChurchAction} className="flex flex-col gap-6">
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <div className="grid gap-6">
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
                placeholder="ex: Igreja Vida Nova"
                required
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm placeholder-[var(--mt-muted)] outline-none focus:border-[var(--mt-primary)]"
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
                placeholder="ex: São Paulo"
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm placeholder-[var(--mt-muted)] outline-none focus:border-[var(--mt-primary)]"
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
                placeholder="ex: SP"
                maxLength={2}
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm placeholder-[var(--mt-muted)] uppercase outline-none focus:border-[var(--mt-primary)]"
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
                defaultValue="active"
                className="rounded-lg border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2 text-sm outline-none focus:border-[var(--mt-primary)]"
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--mt-primary)] px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Criar Igreja
          </button>
          <Link
            href="/admin/global/igrejas"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-6 py-2 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
