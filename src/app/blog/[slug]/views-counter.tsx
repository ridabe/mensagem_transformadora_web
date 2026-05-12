"use client";

import { useEffect, useState } from "react";

function formatViews(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function ViewsCounter({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/blog/views", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug }),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as { views?: unknown } | null;
        const n = typeof json?.views === "number" ? json.views : Number(json?.views ?? NaN);
        if (!cancelled && Number.isFinite(n) && n >= 0) setViews(n);
      } catch {
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return <span>{formatViews(views)} visualizaç{views === 1 ? "ão" : "ões"}</span>;
}

