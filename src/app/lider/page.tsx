import { redirect } from "next/navigation";

import { canAccessChurchAdminArea, getCurrentProfile } from "@/lib/auth/profiles";

export default async function LiderIndexPage() {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile && profile.status !== "blocked") {
    if (profile.role === "admin") redirect("/admin/dashboard");
    if (profile.role === "church_admin") {
      const ok = await canAccessChurchAdminArea(profile);
      if (ok) redirect("/igreja/dashboard");
    }
  }
  redirect("/lider/sermoes");
}
