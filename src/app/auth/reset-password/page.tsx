"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

function getParam(url: URL, name: string): string | null {
  const fromSearch = url.searchParams.get(name);
  if (fromSearch) return fromSearch;

  const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(rawHash);
  return hashParams.get(name);
}

function clearRecoveryParamsFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("access_token");
  url.searchParams.delete("refresh_token");
  url.searchParams.delete("type");
  url.searchParams.delete("token");
  url.searchParams.delete("token_type");
  url.hash = "";

  const qs = url.searchParams.toString();
  window.history.replaceState({}, document.title, `${url.pathname}${qs ? `?${qs}` : ""}`);
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initSessionFromUrl() {
      try {
        const supabase = createClient();
        const url = new URL(window.location.href);
        const code = getParam(url, "code");
        const accessToken = getParam(url, "access_token");
        const refreshToken = getParam(url, "refresh_token");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          clearRecoveryParamsFromUrl();
        } else if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
          clearRecoveryParamsFromUrl();
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) throw new Error("Missing session");
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível redefinir sua senha. Tente novamente.");
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }

    initSessionFromUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || success) return;

    setError(null);

    const safePassword = password;
    const safeConfirm = confirmPassword;

    if (safePassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (safePassword !== safeConfirm) {
      setError("A confirmação de senha não confere.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: safePassword });
      if (updateError) throw updateError;

      setSuccess(true);
      try {
        await supabase.auth.signOut();
      } catch {}

      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setError("Não foi possível redefinir sua senha. Tente novamente.");
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
                d="M12 9v3m0 3h.01M5.07 19a10 10 0 1113.86 0 10.08 10.08 0 01-13.86 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--mt-blue-light)] uppercase tracking-wider mb-2">
            Área do líder
          </p>
          <h1 className="text-4xl font-bold text-[var(--mt-white)] mb-3">Redefinir senha</h1>
          <p className="text-[var(--mt-blue-light)] leading-relaxed">
            Defina uma nova senha para acessar sua conta.
          </p>
        </div>

        {success ? (
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
              <p className="text-sm font-medium">Senha redefinida com sucesso</p>
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
              <label htmlFor="password" className="form-label">
                Nova senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input w-full"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!sessionReady || pending || success}
                aria-disabled={!sessionReady || pending || success}
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
                    Redefinindo...
                  </>
                ) : (
                  <>
                    Redefinir senha
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
              Voltar para{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
              >
                login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
