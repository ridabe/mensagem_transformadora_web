import Link from "next/link";

import { login } from "./actions";
import { SubmitButton } from "./submit-button";

type AdminLoginPageProps = {
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

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const missing = getString(sp, "missing");

  const errorMessage =
    error === "invalid"
      ? "E-mail ou senha inválidos. Verifique os dados e tente novamente."
      : error === "forbidden"
        ? "Este login é exclusivo para administradores."
        : error === "blocked"
          ? "Seu acesso está bloqueado. Entre em contato com o suporte."
          : error === "profile"
            ? "Não foi possível carregar seu perfil. Tente novamente."
            : error === "config"
              ? `Supabase não está configurado no ambiente.${
                  missing ? ` Variável ausente: ${missing}.` : ""
                }`
              : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Acesso restrito para administradores.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={login}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">E-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Senha</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
        </label>

        <SubmitButton />
      </form>

      <p className="text-sm text-[var(--mt-muted)]">
        <Link href="/" className="font-semibold text-[var(--mt-navy)] hover:underline">
          Voltar para o site
        </Link>
      </p>
    </main>
  );
}
