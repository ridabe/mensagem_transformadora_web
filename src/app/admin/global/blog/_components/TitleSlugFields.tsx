"use client";

import { useState } from "react";

function slugify(value: string): string {
  // NFD decomposes accented letters; filter out combining diacritical marks (U+0300–U+036F)
  const decomposed = value
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return decomposed
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type Props = {
  defaultTitle?: string;
  defaultSlug?: string;
};

export function TitleSlugFields({ defaultTitle = "", defaultSlug = "" }: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(defaultSlug);
  // Auto-sync ativo enquanto o usuário não editar o slug manualmente
  const [autoSync, setAutoSync] = useState(!defaultSlug);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    if (autoSync) setSlug(slugify(val));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setAutoSync(false);
  }

  function handleSync() {
    setSlug(slugify(title));
    setAutoSync(true);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">Título</label>
        <input
          name="title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Ex.: Como manter a fé em tempos difíceis"
          className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">Slug</label>
        <input
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="gerado-do-titulo"
          className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
        />
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--mt-muted)]">
          <span>URL: /blog/{slug || "…"}</span>
          {!autoSync && title ? (
            <button
              type="button"
              onClick={handleSync}
              className="font-semibold text-[var(--mt-primary)] hover:underline"
            >
              Gerar do título
            </button>
          ) : null}
        </p>
      </div>
    </div>
  );
}
