"use server";

import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type InvitationRole = "leader" | "church_admin";
type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function normalizeEmail(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(raw)) return null;
  return raw;
}

function normalizeRole(value: unknown): InvitationRole | null {
  if (value === "leader" || value === "church_admin") return value;
  return null;
}

function normalizeStatus(value: unknown): InvitationStatus | null {
  if (value === "pending" || value === "accepted" || value === "cancelled" || value === "expired") return value;
  return null;
}

function normalizeMinistryTitle(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const normalized = raw
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z]/g, "");

  if (
    normalized === "pastor" ||
    normalized === "diacono" ||
    normalized === "bispo" ||
    normalized === "apostolo" ||
    normalized === "missionario" ||
    normalized === "pregador" ||
    normalized === "lider"
  ) {
    return normalized;
  }

  return null;
}

function isExpired(expiresAt: unknown): boolean {
  if (!expiresAt) return false;
  const d = new Date(String(expiresAt));
  if (!Number.isFinite(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

function redirectError(token: string, code: string, reason?: string): never {
  const safeToken = encodeURIComponent(token);
  const safeCode = encodeURIComponent(code);
  const safeReason = (reason || "").trim().slice(0, 200);
  if (safeReason) redirect(`/convite/${safeToken}?error=${safeCode}&reason=${encodeURIComponent(safeReason)}`);
  redirect(`/convite/${safeToken}?error=${safeCode}`);
}

async function loadPendingInvitationOrRedirect(token: string) {
  const service = createServiceRoleClient();
  const rawToken = token.trim();
  if (!rawToken) redirect("/login");

  const { data: invite, error } = await service
    .from("church_invitations")
    .select("id,church_id,invited_by,email,name,ministry_title,role,status,token,expires_at,accepted_at")
    .eq("token", rawToken)
    .maybeSingle();

  if (error) redirectError(rawToken, "invalid", "Erro ao buscar convite.");
  if (!invite?.id) redirectError(rawToken, "invalid", "Convite não encontrado.");

  const status = normalizeStatus(invite?.status) ?? "pending";
  if (status !== "pending") {
    if (status === "accepted") redirectError(rawToken, "used", "Este convite já foi utilizado.");
    if (status === "cancelled") redirectError(rawToken, "cancelled", "Este convite foi cancelado.");
    if (status === "expired") redirectError(rawToken, "expired", "Este convite expirou.");
    redirectError(rawToken, "invalid", "Este convite não está disponível.");
  }

  if (invite?.expires_at && isExpired(invite.expires_at)) redirectError(rawToken, "expired", "Este convite expirou.");

  const { data: church, error: churchError } = await service
    .from("churches")
    .select("id,status,plan_type,plan_status")
    .eq("id", invite.church_id ? String(invite.church_id) : "")
    .maybeSingle();

  if (churchError || !church?.id) redirectError(rawToken, "invalid", "Igreja não encontrada.");
  if (church.status !== "active") redirectError(rawToken, "business_inactive", "Igreja inativa.");
  if (church.plan_type !== "business" || church.plan_status !== "active") {
    redirectError(rawToken, "business_inactive", "Igreja sem plano Business ativo.");
  }

  const email = normalizeEmail(invite.email) ?? "";
  const role = normalizeRole(invite.role) ?? "leader";

  return {
    service,
    invite: {
      id: String(invite.id),
      churchId: String(invite.church_id),
      token: String(invite.token),
      email,
      name: typeof invite.name === "string" ? invite.name : null,
      ministryTitle: typeof invite.ministry_title === "string" ? invite.ministry_title : null,
      role,
    },
  };
}

async function markInvitationAcceptedOrRedirect(service: ReturnType<typeof createServiceRoleClient>, inviteId: string, token: string) {
  const { data, error } = await service
    .from("church_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("token", token)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) redirectError(token, "invalid", "Não foi possível aceitar o convite.");
  if (!data?.id) redirectError(token, "used", "Este convite já foi utilizado.");
}

async function rollbackInvitation(service: ReturnType<typeof createServiceRoleClient>, inviteId: string) {
  await service.from("church_invitations").update({ status: "pending", accepted_at: null }).eq("id", inviteId).eq("status", "accepted");
}

export async function acceptInvitation(formData: FormData) {
  const token = getString(formData, "token").trim();
  const { service, invite } = await loadPendingInvitationOrRedirect(token);
  const normalizedMinistryTitle = normalizeMinistryTitle(invite.ministryTitle);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const sessionUser = userData.user;

  const targetEmail = normalizeEmail(getString(formData, "email")) ?? invite.email;
  if (!targetEmail || targetEmail !== invite.email) {
    redirectError(invite.token, "email_mismatch", "O e-mail informado é diferente do e-mail do convite.");
  }

  if (sessionUser?.id) {
    const sessionEmail = normalizeEmail(sessionUser.email);
    if (!sessionEmail || sessionEmail !== invite.email) {
      redirectError(invite.token, "email_mismatch", "Você está logado com um e-mail diferente do convite.");
    }

    await markInvitationAcceptedOrRedirect(service, invite.id, invite.token);

    try {
      const { data: existingProfile, error: profileReadError } = await service
        .from("profiles")
        .select("id,role,church_id,ministry_title,status,display_name,name")
        .eq("auth_user_id", sessionUser.id)
        .maybeSingle();

      if (profileReadError) throw new Error("Erro ao buscar perfil.");

      const currentRole = existingProfile?.role ? String(existingProfile.role) : null;
      const nextRole =
        invite.role === "church_admin" && currentRole !== "admin" ? "church_admin" : currentRole ?? "leader";

      const updatePayload: Record<string, unknown> = {
        church_id: invite.churchId,
        role: nextRole,
        church_membership_source: "invitation",
        church_membership_confirmed_at: new Date().toISOString(),
      };
      if (normalizedMinistryTitle) updatePayload.ministry_title = normalizedMinistryTitle;
      const currentDisplayName = typeof existingProfile?.display_name === "string" ? existingProfile.display_name.trim() : "";
      if (invite.name && !currentDisplayName) {
        updatePayload.display_name = invite.name;
        updatePayload.name = invite.name;
      }

      if (existingProfile?.id) {
        const { error: updateError } = await service.from("profiles").update(updatePayload).eq("auth_user_id", sessionUser.id);
        if (updateError) throw new Error(updateError.message || "Erro ao atualizar perfil.");
      } else {
        const { error: insertError } = await service.from("profiles").insert({
          auth_user_id: sessionUser.id,
          name: invite.name ?? invite.email.split("@")[0],
          display_name: invite.name ?? invite.email.split("@")[0],
          email: invite.email,
          role: nextRole,
          status: "active",
          church_id: invite.churchId,
          church_membership_source: "invitation",
          church_membership_confirmed_at: new Date().toISOString(),
          ministry_title: normalizedMinistryTitle,
        });
        if (insertError) throw new Error(insertError.message || "Erro ao criar perfil.");
      }
    } catch (err) {
      await rollbackInvitation(service, invite.id);
      const message = err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : "Falha ao aceitar convite.";
      redirectError(invite.token, "profile", message);
    }

    if (invite.role === "church_admin") redirect("/igreja/dashboard");
    redirect("/lider/sermoes");
  }

  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirm_password");
  if (password.length < 6) redirectError(invite.token, "password", "Informe uma senha com pelo menos 6 caracteres.");
  if (password !== confirmPassword) redirectError(invite.token, "password", "As senhas não conferem.");

  await markInvitationAcceptedOrRedirect(service, invite.id, invite.token);

  try {
    const created = await service.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: invite.name ?? invite.email.split("@")[0],
        ministry_title: normalizedMinistryTitle,
      },
    });

    if (created.error || !created.data.user?.id) {
      const msg = (created.error?.message || "").trim();
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        throw new Error("Já existe uma conta com este e-mail. Faça login para aceitar o convite.");
      }
      throw new Error(msg || "Erro ao criar conta.");
    }

    const newUserId = created.data.user.id;

    const { error: profileError } = await service.from("profiles").insert({
      auth_user_id: newUserId,
      name: invite.name ?? invite.email.split("@")[0],
      display_name: invite.name ?? invite.email.split("@")[0],
      email: invite.email,
      role: invite.role,
      status: "active",
      church_id: invite.churchId,
      church_membership_source: "invitation",
      church_membership_confirmed_at: new Date().toISOString(),
      ministry_title: normalizedMinistryTitle,
    });

    if (profileError) {
      await service.auth.admin.deleteUser(newUserId);
      throw new Error(profileError.message || "Erro ao criar perfil.");
    }

    const signIn = await supabase.auth.signInWithPassword({ email: invite.email, password });
    if (signIn.error) {
      redirect("/login?info=created");
    }

    if (invite.role === "church_admin") redirect("/igreja/dashboard");
    redirect("/lider/sermoes");
  } catch (err) {
    await rollbackInvitation(service, invite.id);
    const message = err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : "Falha ao aceitar convite.";
    redirectError(invite.token, "signup", message);
  }
}
