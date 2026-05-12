"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Métricas", href: "/admin/global/blog/metricas" },
  { label: "Posts", href: "/admin/global/blog", exact: true },
  { label: "Categorias", href: "/admin/global/blog/categorias" },
  { label: "Tags", href: "/admin/global/blog/tags" },
];

export function BlogAdminNav() {
  const pathname = usePathname();

  function isActive(tab: (typeof tabs)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-background)] p-1">
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-[var(--mt-surface)] text-[var(--mt-text)] shadow-sm"
                : "text-[var(--mt-muted)] hover:text-[var(--mt-text)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
