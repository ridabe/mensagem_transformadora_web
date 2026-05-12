"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { label: "Igrejas", href: "/admin/global/igrejas" },
  { label: "Blog", href: "/admin/global/blog" },
];

export function AdminGlobalNav() {
  const pathname = usePathname();

  const activeSection = sections.findLast((s) => pathname.startsWith(s.href));

  return (
    <nav className="flex gap-1 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
      {sections.map((s) => {
        const active = activeSection?.href === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-[var(--mt-primary)] text-white"
                : "text-[var(--mt-muted)] hover:bg-[var(--mt-background)] hover:text-[var(--mt-text)]"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
