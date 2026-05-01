"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

const FALLBACK_SITE_URL = "https://mensagem-transformadora-web.vercel.app";

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, "");
}

export default function ForgotPasswordPage() {
  const siteUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_SITE_URL;
    return raw && raw.trim() ? normalizeSiteUrl(raw) : FALLBACK_SITE_URL;
  }, []);

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setSent(false);

    const safeEmail = email.trim();
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(safeEmail, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch {
      setError("Não foi possível enviar o e-mail. Verifique o endereço informado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--mt-gradient-primary)]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--mt-gold)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--mt-navy)]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--mt-gradient-gold)] shadow-lg shadow-[var(--mt-gold)]/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2v1a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6zm6 5a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--mt-blue-light)] uppercase tracking-wider mb-2">
            Área do líder
          </p>
          <h1 className="text-4xl font-bold text-[var(--mt-white)] mb-3">Recuperar senha</h1>
          <p className="text-[var(--mt-blue-light)] leading-relaxed">
            Informe seu e-mail para receber o link de recuperação de senha.
          </p>
        </div>

        {sent ? (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--mt-gold)]/15 border border-[var(--mt-gold)]/30 text-[var(--mt-gold)] animate-slide-in-right">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[var(--mt-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">Enviamos um link de recuperação para seu e-mail.</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 p-4 rounded-2xl bg-red-900/30 border border-red-700/50 text-red-200 animate-slide-in-right">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input w-full"
                placeholder="seu@email.com"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pending}
                aria-disabled={pending}
                className="form-button w-full disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:transform-none disabled:hover:shadow-none flex items-center justify-center gap-3"
              >
                {pending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar link de recuperação
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--mt-border)]">
            <p className="text-center text-sm text-[var(--mt-blue-light)]">
              Lembrou da senha?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
              >
                Voltar para o login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
