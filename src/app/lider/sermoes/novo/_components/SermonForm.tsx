"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { VerseFieldMain, VerseFieldSecondary } from "@/components/bible";

type SermonFormProps = {
  action: (formData: FormData) => Promise<void>;
  aiDisabledForFree: boolean;
  errorMessage?: string | null;
};

export function SermonForm({ action, aiDisabledForFree, errorMessage }: SermonFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fullSermon, setFullSermon] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!formRef.current) return;
    setGenerateError(null);

    const fd = new FormData(formRef.current);
    const title = (fd.get("title") as string | null)?.trim() ?? "";
    const mainVerse = (fd.get("main_verse") as string | null)?.trim() ?? "";
    const notes = (fd.get("notes") as string | null)?.trim() ?? null;
    const secondaryVerses = fd.getAll("secondary_verses").map(String).filter(Boolean);

    if (!title) {
      setGenerateError("Preencha o título antes de gerar a mensagem.");
      return;
    }
    if (!mainVerse) {
      setGenerateError("Selecione o versículo principal antes de gerar a mensagem.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/me/sermons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, main_verse: mainVerse, secondary_verses: secondaryVerses, notes }),
      });

      const data = (await res.json()) as { sermon?: string; error?: { message?: string } };

      if (!res.ok) {
        setGenerateError(data.error?.message ?? "Não foi possível gerar a mensagem. Tente novamente.");
        return;
      }

      setFullSermon(data.sermon ?? "");
    } catch {
      setGenerateError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
    >
      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {errorMessage}
        </div>
      ) : null}

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold">Título</span>
        <input
          name="title"
          required
          className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
          placeholder="Ex: Série sobre fé — Parte 1"
        />
      </label>

      <VerseFieldMain name="main_verse" required />

      <VerseFieldSecondary name="secondary_verses" />

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold">Notas (opcional)</span>
        <textarea
          name="notes"
          rows={6}
          className="rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
          placeholder="Rascunho, ideias, estrutura…"
        />
      </label>

      {/* Botão de geração via IA — separado como ação explícita */}
      <div className="flex flex-col gap-2">
        {aiDisabledForFree ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-3">
            <span className="text-base leading-none opacity-40" aria-hidden>✦</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[var(--mt-text)] opacity-50">Gerar mensagem com IA</span>
              <span className="text-xs text-[var(--mt-muted)]">
                Disponível apenas para planos pagos.{" "}
                <Link href="/lider/planos" className="font-medium text-[var(--mt-navy)] underline underline-offset-2">
                  Ver planos
                </Link>
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[var(--mt-night)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--mt-gradient-gold)" }}
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Gerando mensagem com IA…
              </>
            ) : (
              <>
                <span className="text-base leading-none" aria-hidden>✦</span>
                Gerar mensagem completa com IA
              </>
            )}
          </button>
        )}

        {generateError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {generateError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-semibold">Mensagem completa (opcional)</span>

        <textarea
          name="full_sermon"
          rows={12}
          value={fullSermon}
          onChange={(e) => setFullSermon(e.target.value)}
          className="rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
          placeholder="Digite aqui a mensagem completa ou use o botão acima para gerar com IA."
        />
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold">Status</span>
        <select
          name="status"
          defaultValue="active"
          className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
        >
          <option value="draft">Rascunho</option>
          <option value="active">Ativo</option>
        </select>
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
        >
          Salvar
        </button>
        <Link
          href="/lider/sermoes"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
