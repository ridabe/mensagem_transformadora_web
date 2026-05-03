import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";

type AdminChurchRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: "active" | "inactive";
};

type AdminChurchWithCounts = AdminChurchRow & { leadersCount: number };

type AdminChurchesPageProps = {
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

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseStatus(value: string): "active" | "inactive" {
  return value === "inactive" ? "inactive" : "active";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function createChurchAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const name = normalizeOptionalText(getFormString(formData, "name"));
  const city = normalizeOptionalText(getFormString(formData, "city"));
  const state = normalizeOptionalText(getFormString(formData, "state"));
  const status = parseStatus(getFormString(formData, "status"));

  if (!name) redirect("/admin/igrejas?error=name");

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").insert({ name, city, state, status });
  if (error) redirect("/admin/igrejas?error=create");

  redirect("/admin/igrejas?saved=1");
}

export async function updateChurchAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const id = getFormString(formData, "id").trim();
  if (!id) redirect("/admin/igrejas");

  const name = normalizeOptionalText(getFormString(formData, "name"));
  const city = normalizeOptionalText(getFormString(formData, "city"));
  const state = normalizeOptionalText(getFormString(formData, "state"));
  const status = parseStatus(getFormString(formData, "status"));

  if (!name) redirect(`/admin/igrejas?error=name&id=${encodeURIComponent(id)}`);

  const service = createServiceRoleClient();
  const { error } = await service
    .from("churches")
    .update({ name, city, state, status })
    .eq("id", id);

  if (error) redirect(`/admin/igrejas?error=update&id=${encodeURIComponent(id)}`);
  redirect("/admin/igrejas?saved=1");
}

export async function setChurchStatusAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const id = getFormString(formData, "id").trim();
  if (!id) redirect("/admin/igrejas");

  const status = parseStatus(getFormString(formData, "next_status"));

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").update({ status }).eq("id", id);
  if (error) redirect(`/admin/igrejas?error=status&id=${encodeURIComponent(id)}`);

  redirect("/admin/igrejas?saved=1");
}

export default async function AdminIgrejasPage({ searchParams }: AdminChurchesPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const missing = getString(sp, "missing");

  try {
    await createClient();
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Supabase não está configurado no ambiente.";
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Configuração</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">{message}</p>
      </main>
    );
  }

  await requireAdmin();

  const errorMessage =
    error === "name"
      ? "O nome da igreja é obrigatório."
      : error === "create"
        ? "Não foi possível criar a igreja."
        : error === "update"
          ? "Não foi possível atualizar a igreja."
          : error === "status"
            ? "Não foi possível atualizar o status da igreja."
            : error === "config"
              ? `Supabase não está configurado no ambiente.${missing ? ` Variável ausente: ${missing}.` : ""}`
              : null;

  const service = createServiceRoleClient();

  const { data: churchesData, error: churchesError } = await service
    .from("churches")
    .select("id,name,city,state,status")
    .order("name", { ascending: true });

  if (churchesError) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Igrejas</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar a lista de igrejas.
        </p>
      </main>
    );
  }

  const { data: leaderRows } = await service
    .from("profiles")
    .select("church_id")
    .eq("role", "leader")
    .not("church_id", "is", null);

  const counts = new Map<string, number>();
  for (const row of leaderRows ?? []) {
    const churchId = row && typeof row === "object" && "church_id" in row ? row.church_id : null;
    if (typeof churchId !== "string" || !churchId) continue;
    counts.set(churchId, (counts.get(churchId) ?? 0) + 1);
  }

  const churches: AdminChurchWithCounts[] = ((churchesData ?? []) as AdminChurchRow[]).map((c) => ({
    ...c,
    leadersCount: counts.get(c.id) ?? 0,
  }));

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Igrejas</p>
        <h2 className="text-2xl font-semibold tracking-tight">Gerenciar igrejas</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Cadastre, edite e ative/inative igrejas para o cadastro público de líderes.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="text-base font-semibold">Nova igreja</h3>
        <form action={createChurchAction} className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            <span className="font-semibold">Nome</span>
            <input
              name="name"
              type="text"
              required
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              placeholder="Nome da igreja"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Cidade</span>
            <input
              name="city"
              type="text"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              placeholder="Opcional"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Estado</span>
            <input
              name="state"
              type="text"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              placeholder="Opcional"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Status</span>
            <select
              name="status"
              defaultValue="active"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            >
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
            </select>
          </label>

          <div className="flex items-end md:col-span-3">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Criar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="text-base font-semibold">Igrejas cadastradas</h3>
        {churches.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--mt-muted)]">Nenhuma igreja cadastrada ainda.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {churches.map((church) => (
              <form
                key={church.id}
                action={updateChurchAction}
                className="grid gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 md:grid-cols-6"
              >
                <input type="hidden" name="id" value={church.id} />

                <label className="flex flex-col gap-2 text-sm md:col-span-2">
                  <span className="font-semibold">Nome</span>
                  <input
                    name="name"
                    type="text"
                    defaultValue={church.name}
                    required
                    className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-semibold">Cidade</span>
                  <input
                    name="city"
                    type="text"
                    defaultValue={church.city ?? ""}
                    className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-semibold">Estado</span>
                  <input
                    name="state"
                    type="text"
                    defaultValue={church.state ?? ""}
                    className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-semibold">Status</span>
                  <select
                    name="status"
                    defaultValue={church.status}
                    className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </select>
                </label>

                <div className="flex flex-col justify-end gap-2 md:col-span-1">
                  <p className="text-xs text-[var(--mt-muted)]">
                    Líderes: <span className="font-semibold text-[var(--mt-text)]">{church.leadersCount}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/lideres?church=${encodeURIComponent(church.id)}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Ver líderes
                    </Link>
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Salvar
                    </button>
                    <button
                      formAction={setChurchStatusAction}
                      name="next_status"
                      value={church.status === "active" ? "inactive" : "active"}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {church.status === "active" ? "Inativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
