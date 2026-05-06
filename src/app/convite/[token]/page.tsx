import Link from "next/link";

import { acceptInvitation } from "./actions";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ token: string }>;
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

function normalizeEmail(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(raw)) return null;
  return raw;
}

function isExpired(expiresAt: unknown): boolean {
  if (!expiresAt) return false;
  const d = new Date(String(expiresAt));
  if (!Number.isFinite(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

async function loadInvitePreview(token: string): Promise<{
  email: string;
  name: string | null;
  ministryTitle: string | null;
  role: "leader" | "church_admin";
} | null> {
  const service = createServiceRoleClient();
  const { data: invite, error } = await service
    .from("church_invitations")
    .select("church_id,email,name,ministry_title,role,status,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return null;
  if (String(invite.status) !== "pending") return null;
  if (invite.expires_at && isExpired(invite.expires_at)) return null;

  const { data: church } = await service
    .from("churches")
    .select("id,status,plan_type,plan_status")
    .eq("id", String(invite.church_id))
    .maybeSingle();

  if (!church?.id) return null;
  if (church.status !== "active") return null;
  if (church.plan_type !== "business" || church.plan_status !== "active") return null;

  const email = normalizeEmail(invite.email);
  if (!email) return null;
  const role = invite.role === "church_admin" ? "church_admin" : "leader";

  return {
    email,
    name: typeof invite.name === "string" ? invite.name : null,
    ministryTitle: typeof invite.ministry_title === "string" ? invite.ministry_title : null,
    role,
  };
}

export default async function ConvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const sp = searchParams ? await searchParams : undefined;

  const error = getString(sp, "error");
  const reason = getString(sp, "reason");

  const invite = await loadInvitePreview(token);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const userEmail = normalizeEmail(user?.email);

  const errorMessage =
    error === "invalid"
      ? `Convite inválido.${reason ? ` Motivo: ${reason}` : ""}`
      : error === "used"
        ? `Este convite já foi utilizado.${reason ? ` Motivo: ${reason}` : ""}`
        : error === "cancelled"
          ? `Este convite foi cancelado.${reason ? ` Motivo: ${reason}` : ""}`
          : error === "expired"
            ? `Este convite expirou.${reason ? ` Motivo: ${reason}` : ""}`
            : error === "business_inactive"
              ? `A igreja deste convite não possui plano Business ativo.${reason ? ` Motivo: ${reason}` : ""}`
              : error === "email_mismatch"
                ? `O e-mail não confere com o convite.${reason ? ` Motivo: ${reason}` : ""}`
                : error === "password"
                  ? `Senha inválida.${reason ? ` Motivo: ${reason}` : ""}`
                  : error === "signup"
                    ? `Não foi possível criar sua conta.${reason ? ` Motivo: ${reason}` : ""}`
                    : error === "profile"
                      ? `Não foi possível vincular seu perfil à igreja.${reason ? ` Motivo: ${reason}` : ""}`
                      : null;

  const loggedEmailMismatch = Boolean(invite?.email && userEmail && userEmail !== invite.email);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--mt-gradient-primary)]" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-[var(--mt-gold)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[var(--mt-navy)]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[var(--mt-gradient-gold)] shadow-lg shadow-[var(--mt-gold)]/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0 3.866-3.134 7-7 7H4a2 2 0 01-2-2v-1a6 6 0 0112 0v1h1m10-3v3m0 0v3m0-3h3m-3 0h-3"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--mt-blue-light)] uppercase tracking-wider mb-2">
            Convite da igreja
          </p>
          <h1 className="text-4xl font-bold text-[var(--mt-white)] mb-3">Aceitar convite</h1>
          <p className="text-[var(--mt-blue-light)] leading-relaxed max-w-md mx-auto">
            Vincule sua conta à igreja e desbloqueie os recursos do plano Business.
          </p>
        </div>

        {errorMessage ? (
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
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        {!invite ? (
          <div className="bg-[var(--mt-blue-medium)] rounded-3xl shadow-xl shadow-black/5 p-8 border border-[var(--mt-border)]">
            <p className="text-[var(--mt-blue-light)]">
              Este convite não está disponível. Verifique o link ou solicite um novo convite ao administrador da igreja.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/login"
                className="form-button inline-flex items-center justify-center px-6 py-3"
              >
                Ir para login
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-[var(--mt-blue-light)] hover:text-[var(--mt-white)] transition-colors duration-200"
              >
                Voltar ao site
              </Link>
            </div>
          </div>
        ) : (
          <form
            action={acceptInvitation}
            className="bg-[var(--mt-blue-medium)] rounded-3xl shadow-xl shadow-black/5 p-8 border border-[var(--mt-border)] animate-fade-in-up stagger-2"
          >
            <input type="hidden" name="token" value={token} />
            <div className="grid gap-6">
              <div>
                <label htmlFor="email" className="form-label">
                  E-mail do convite
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  readOnly
                  className="form-input w-full opacity-90"
                  defaultValue={invite.email}
                />
                {loggedEmailMismatch ? (
                  <p className="text-xs text-red-200 mt-2">
                    Você está logado como {userEmail}. Faça login com {invite.email} para aceitar este convite.
                  </p>
                ) : null}
              </div>

              {user?.id ? (
                <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-blue-medium)]/30 p-4">
                  <p className="text-sm leading-6 text-[var(--mt-blue-light)]">
                    Você está logado como {userEmail}. Ao aceitar, sua conta será vinculada à igreja.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="password" className="form-label">
                      Crie uma senha
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
                    <p className="text-xs text-[var(--mt-blue-light)] mt-2">Mínimo 6 caracteres</p>
                  </div>
                  <div>
                    <label htmlFor="confirm_password" className="form-label">
                      Confirmar senha
                    </label>
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="form-input w-full"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-blue-medium)]/30 p-4">
                    <p className="text-sm leading-6 text-[var(--mt-blue-light)]">
                      Já tem conta com este e-mail? Faça login antes de aceitar o convite.
                    </p>
                    <div className="mt-3">
                      <Link
                        href="/login"
                        className="text-sm font-semibold text-[var(--mt-gold)] hover:text-[var(--mt-white)] transition-colors duration-200"
                      >
                        Ir para login
                      </Link>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="form-button w-full disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loggedEmailMismatch}
                >
                  Aceitar convite
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

