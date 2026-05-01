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
  const info = getString(sp, "info");
  const reason = getString(sp, "reason");

  const errorMessage =
    error === "invalid"
      ? `E-mail ou senha inválidos. Verifique os dados e tente novamente.${reason ? ` Motivo: ${reason}` : ""}`
      : error === "confirm"
        ? `Seu e-mail ainda não foi confirmado.${reason ? ` Motivo: ${reason}` : ""} Verifique sua caixa de entrada.`
      : error === "blocked"
        ? "Seu acesso está bloqueado. Entre em contato com o suporte."
        : error === "profile"
          ? "Não foi possível carregar seu perfil. Tente novamente."
          : error === "config"
            ? `Supabase não está configurado no ambiente.${
                missing ? ` Variável ausente: ${missing}.` : ""
              }`
            : null;

  const infoMessage =
    info === "created"
      ? "Conta criada. Faça login para acessar a área do líder."
      : info === "confirm"
        ? "Conta criada. Verifique seu e-mail para confirmar o cadastro antes de fazer login."
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[var(--mt-gradient-primary)]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--mt-gold)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--mt-navy)]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Header section with modern card design */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--mt-gradient-gold)] shadow-lg shadow-[var(--mt-gold)]/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--mt-blue-light)] uppercase tracking-wider mb-2">
            Área do líder
          </p>
          <h1 className="text-4xl font-bold text-[var(--mt-white)] mb-3">
            Bem-vindo de volta
          </h1>
          <p className="text-[var(--mt-blue-light)] leading-relaxed">
            Faça login para acessar sua área restrita e gerenciar suas mensagens.
          </p>
        </div>

        {/* Messages with modern styling */}
        {infoMessage ? (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--mt-gold)]/15 border border-[var(--mt-gold)]/30 text-[var(--mt-gold)] animate-slide-in-right">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[var(--mt-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">{infoMessage}</p>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 p-4 rounded-2xl bg-red-900/30 border border-red-700/50 text-red-200 animate-slide-in-right">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        {/* Login form with modern card design */}
        <form
          action={login}
          className="bg-[var(--mt-blue-medium)] rounded-3xl shadow-xl shadow-black/5 p-8 border border-[var(--mt-border)] animate-fade-in-up stagger-2"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input w-full"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-input w-full"
                placeholder="••••••••"
              />
              <div className="mt-3 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--mt-border)]">
            <p className="text-center text-sm text-[var(--mt-blue-light)]">
              Ainda não tem conta?{" "}
              <Link
                href="/cadastro"
                className="font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
              >
                Criar conta gratuita
              </Link>
            </p>
          </div>
        </form>

        {/* Footer link */}
        <div className="text-center mt-8 animate-fade-in-up stagger-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--mt-muted)] hover:text-[var(--mt-text)] transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
