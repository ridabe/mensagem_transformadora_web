import Link from "next/link";

import { signup } from "./actions";

import { SubmitButton } from "@/app/admin/login/submit-button";
import { createServiceRoleClient } from "@/lib/supabase/server";

type SignupPageProps = {
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

export default async function CadastroPage({ searchParams }: SignupPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const missing = getString(sp, "missing");
  const reason = getString(sp, "reason");

  let churches: { id: string; name: string; city: string | null; state: string | null }[] = [];
  let churchesError: string | null = null;
  try {
    const service = createServiceRoleClient();
    const { data, error: loadError } = await service
      .from("churches")
      .select("id,name,city,state")
      .eq("status", "active")
      .order("name", { ascending: true });
    if (loadError) churchesError = "Não foi possível carregar a lista de igrejas.";
    churches = (data ?? []) as typeof churches;
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Supabase não está configurado no ambiente.";
    churchesError = message;
  }

  const errorMessage =
    error === "name"
      ? "Informe seu nome completo (mínimo 3 caracteres)."
      : error === "email"
        ? "Informe um e-mail válido."
        : error === "password"
          ? "Informe uma senha com pelo menos 6 caracteres."
          : error === "church"
            ? "Selecione uma igreja válida."
          : error === "signup"
            ? `Não foi possível criar sua conta.${reason ? ` Motivo: ${reason}` : " Verifique os dados e tente novamente."}`
            : error === "config"
              ? `Supabase não está configurado no ambiente.${
                  missing ? ` Variável ausente: ${missing}.` : ""
                }`
              : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder</p>
        <h1 className="text-3xl font-semibold tracking-tight">Cadastro</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Crie sua conta gratuita para acessar a área do líder.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={signup}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Nome completo</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="Seu nome"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="voce@exemplo.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Igreja</span>
          <select
            name="church_id"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            defaultValue=""
          >
            <option value="" disabled>
              Selecione sua igreja
            </option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city || c.state ? ` • ${[c.city, c.state].filter(Boolean).join(" / ")}` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--mt-muted)]">
            Não encontrou sua igreja? Entre em contato com o administrador para solicitar o cadastro.
          </p>
          {churchesError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{churchesError}</p>
          ) : null}
        </label>

        <div className="mt-2 flex items-center justify-between gap-4">
          <SubmitButton />
          <Link href="/login" className="text-sm font-semibold text-[var(--mt-text)] hover:underline">
            Já tenho conta
          </Link>
        </div>
      </form>

      <p className="text-sm text-[var(--mt-muted)]">
        <Link href="/" className="font-semibold text-[var(--mt-text)] hover:underline">
          Voltar ao site
        </Link>
      </p>
    </main>
  );
}

