import Link from "next/link";

import { signup } from "./actions";

import { SubmitButton } from "./submit-button";

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

  const errorMessage =
    error === "ministry_title"
      ? "Selecione sua função ministerial."
      : error === "name"
      ? "Informe seu nome completo (mínimo 3 caracteres)."
      : error === "email"
        ? "Informe um e-mail válido."
        : error === "password"
          ? "Informe uma senha com pelo menos 6 caracteres."
          : error === "terms"
            ? "Você precisa aceitar os Termos de Uso e a Política de Privacidade."
          : error === "signup"
            ? `Não foi possível criar sua conta.${reason ? ` Motivo: ${reason}` : " Verifique os dados e tente novamente."}`
            : error === "profile"
              ? `Sua conta foi criada, mas não foi possível salvar seu perfil.${reason ? ` Motivo: ${reason}` : ""}`
              : error === "subscription"
                ? `Sua conta foi criada, mas não foi possível criar sua assinatura gratuita.${reason ? ` Motivo: ${reason}` : ""}`
            : error === "config"
              ? `Supabase não está configurado no ambiente.${
                  missing ? ` Variável ausente: ${missing}.` : ""
                }`
              : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[var(--mt-gradient-primary)]" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[var(--mt-gold)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[var(--mt-navy)]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header section with modern card design */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--mt-gradient-gold)] shadow-lg shadow-[var(--mt-gold)]/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--mt-blue-light)] uppercase tracking-wider mb-2">
            Área do líder
          </p>
          <h1 className="text-4xl font-bold text-[var(--mt-white)] mb-3">
            Criar conta gratuita
          </h1>
          <p className="text-[var(--mt-blue-light)] leading-relaxed max-w-md mx-auto">
            Comece sua jornada como líder e tenha acesso a ferramentas poderosas para organizar suas mensagens.
          </p>
        </div>

        {/* Error message with modern styling */}
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

        {/* Signup form with modern card design */}
        <form
          action={signup}
          className="bg-[var(--mt-blue-medium)] rounded-3xl shadow-xl shadow-black/5 p-8 border border-[var(--mt-border)] animate-fade-in-up stagger-2"
        >
          <div className="grid gap-6">
            <div>
              <label htmlFor="ministry_title" className="form-label">
                Função ministerial
              </label>
              <select
                id="ministry_title"
                name="ministry_title"
                required
                className="form-input w-full"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione sua função
                </option>
                <option value="pastor">Pr. — Pastor</option>
                <option value="diacono">Diácono</option>
                <option value="bispo">Bispo</option>
                <option value="apostolo">Apóstolo</option>
                <option value="missionario">Missionário</option>
                <option value="pregador">Pregador</option>
                <option value="lider">Liderr</option>
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="form-label">
                  Nome completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="form-input w-full"
                  placeholder="Seu nome completo"
                />
              </div>

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
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="form-input w-full"
                placeholder="••••••••"
              />
              <p className="text-xs text-[var(--mt-blue-light)] mt-2">
                Mínimo 6 caracteres
              </p>
            </div>

            <div>
              <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-blue-medium)]/30 p-4">
                <p className="text-sm leading-6 text-[var(--mt-blue-light)]">
                  Faz parte de uma igreja com plano Business? Peça um convite ao administrador da sua igreja.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-blue-medium)]/30 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-[var(--mt-border)] bg-transparent text-[var(--mt-gold)]"
                />
                <label htmlFor="terms" className="text-sm leading-6 text-[var(--mt-blue-light)]">
                  Li e aceito os{" "}
                  <Link
                    href="/termos"
                    className="font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
                  >
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link
                    href="/privacidade"
                    className="font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </label>
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton />
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[var(--mt-blue-light)]">
                <svg className="h-3.5 w-3.5 shrink-0 text-[var(--mt-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Grátis para sempre no plano básico · Sem cobranças surpresa
              </p>
              <p className="mt-3 text-center text-xs text-[var(--mt-blue-light)]/70 leading-5">
                Seus dados são tratados em conformidade com a{" "}
                <abbr title="Lei Geral de Proteção de Dados — Lei nº 13.709/2018">LGPD</abbr>
                . Coletamos apenas as informações necessárias para criar e manter sua conta.
                Consulte nossa{" "}
                <Link
                  href="/privacidade"
                  className="underline underline-offset-2 hover:text-[var(--mt-white)] transition-colors duration-200"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--mt-border)]">
            <p className="text-center text-sm text-[var(--mt-blue-light)]">
              Já tem conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </form>

        {/* Benefits section */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3 animate-fade-in-up stagger-3">
          <div className="text-center p-4 rounded-2xl bg-[var(--mt-blue-medium)]/50 border border-[var(--mt-border)]">
            <div className="w-8 h-8 bg-[var(--mt-gradient-gold)] rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-[var(--mt-white)]">Gratuito</p>
            <p className="text-xs text-[var(--mt-blue-light)] mt-1">Sempre</p>
          </div>

          <div className="text-center p-4 rounded-2xl bg-[var(--mt-blue-medium)]/50 border border-[var(--mt-border)]">
            <div className="w-8 h-8 bg-[var(--mt-gradient-gold)] rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-[var(--mt-white)]">10 pré-sermões</p>
            <p className="text-xs text-[var(--mt-blue-light)] mt-1">Por mês</p>
          </div>

          <div className="text-center p-4 rounded-2xl bg-[var(--mt-blue-medium)]/50 border border-[var(--mt-border)]">
            <div className="w-8 h-8 bg-[var(--mt-gradient-gold)] rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-[var(--mt-white)]">Offline-first</p>
            <p className="text-xs text-[var(--mt-blue-light)] mt-1">Sempre disponível</p>
          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-8 animate-fade-in-up stagger-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--mt-blue-light)] hover:text-[var(--mt-white)] transition-colors duration-200"
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

