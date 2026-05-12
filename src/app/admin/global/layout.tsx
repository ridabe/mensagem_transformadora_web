import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/profiles";
import { AdminGlobalNav } from "./_components/AdminGlobalNav";

export default async function AdminGlobalLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <AdminGlobalNav />
      {children}
    </>
  );
}
