import { requireLeader } from "@/lib/auth/profiles";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function LiderSermoesPage() {
  const profile = await requireLeader();

  let churchId: string | null = profile.churchId;
  try {
    const service = createServiceRoleClient();
    const { data } = await service
      .from("profiles")
      .select("church_id")
      .eq("auth_user_id", profile.authUserId)
      .maybeSingle();
    const fromDb = data && typeof data === "object" && "church_id" in data ? data.church_id : null;
    if (typeof fromDb === "string" && fromDb.trim()) churchId = fromDb;
  } catch {
  }

  let churchLabel: string | null = null;
  if (churchId) {
    try {
      const service = createServiceRoleClient();
      const { data } = await service
        .from("churches")
        .select("name,status")
        .eq("id", churchId)
        .maybeSingle();
      const name = data && typeof data.name === "string" ? data.name : null;
      const status = data && typeof data.status === "string" ? data.status : null;
      if (name) {
        churchLabel = status === "inactive" ? `${name} (inativa)` : name;
      }
    } catch {
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Sermões</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Bem-vindo, {profile.name}
        </h2>
        <p className="text-sm text-[var(--mt-muted)]">
          Igreja:{" "}
          <span className="font-semibold text-[var(--mt-text)]">
            {churchLabel ?? "Não informada"}
          </span>
        </p>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Em breve você poderá criar e gerenciar seus pré-sermões por aqui.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8">
        <p className="text-sm font-medium">Fase 1 concluída</p>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Esta tela existe para validar autenticação e autorização por role.
        </p>
      </div>
    </main>
  );
}

