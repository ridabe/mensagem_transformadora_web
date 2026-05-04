import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/profiles";

export default async function AdminGlobalLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Ensure only admin can access this area
  await requireAdmin();

  return <>{children}</>;
}
