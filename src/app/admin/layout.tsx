import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/admin/login/actions";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--mt-muted)]">Admin</p>
          <h1 className="text-lg font-semibold tracking-tight">
            Mensagem Transformadora
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/admin/dashboard"
              className="font-semibold text-[var(--mt-text)] hover:underline"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/mensagens"
              className="font-semibold text-[var(--mt-text)] hover:underline"
            >
              Mensagens
            </Link>
            <Link
              href="/admin/igrejas"
              className="font-semibold text-[var(--mt-text)] hover:underline"
            >
              Igrejas
            </Link>
            <Link
              href="/mensagens"
              className="font-semibold text-[var(--mt-text)] hover:underline"
            >
              Site público
            </Link>
          </nav>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {children}
    </div>
  );
}
