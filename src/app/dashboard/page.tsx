import { redirect } from "next/navigation";

import { canAccessChurchAdminArea, getCurrentProfile } from "@/lib/auth/profiles";

type DashboardPageProps = {
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const payment = getString(sp, "payment");
  const suffix = payment === "success" ? "?checkout=success" : "";
  const profile = await getCurrentProfile().catch(() => null);
  if (profile && profile.status !== "blocked") {
    if (profile.role === "admin") redirect("/admin/dashboard");
    if (profile.role === "church_admin") {
      const ok = await canAccessChurchAdminArea(profile);
      if (ok) redirect("/igreja/dashboard");
    }
  }
  redirect(`/lider/assinatura${suffix}`);
}

