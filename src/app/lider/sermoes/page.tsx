import { requireLeader } from "@/lib/auth/profiles";

export default async function LiderSermoesPage() {
  const profile = await requireLeader();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Sermões</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Bem-vindo, {profile.name}
        </h2>
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

