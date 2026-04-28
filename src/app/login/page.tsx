import Link from "next/link";
import { redirect } from "next/navigation";

import { login } from "./actions";

import { SubmitButton } from "@/app/admin/login/submit-button";
import { getCurrentProfile } from "@/lib/auth/profiles";

type LoginPageProps = {
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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const current = await getCurrentProfile().catch(() => null);
  if (current && current.status !== "blocked") {
    if (current.role === "admin") redirect("/admin/dashboard");
    redirect("/lider/sermoes");
  }

  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const missing = getString(sp, "missing");

  const errorMessage =
    error === "invalid"
      ? "E-mail ou senha inválidos. Verifique os dados e tente novamente."
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
        <p className="text-sm text-[var(--mt-muted)]">Mensagem Transformadora</p>
        <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Acesse a área administrativa ou a área do líder.
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
            autoComplete="current-password"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-4">
          <SubmitButton />
          <Link href="/" className="text-sm font-semibold text-[var(--mt-text)] hover:underline">
            Voltar ao site
          </Link>
        </div>
      </form>
    </main>
  );
}
