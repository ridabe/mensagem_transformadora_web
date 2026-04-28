"use client";

import { useCallback, useMemo, useState } from "react";

type CopyShareCodeButtonProps = {
  code: string;
};

async function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyShareCodeButton({ code }: CopyShareCodeButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const label = useMemo(() => {
    if (status === "copied") return "Código copiado";
    if (status === "error") return "Falha ao copiar";
    return "Copiar código";
  }, [status]);

  const onCopy = useCallback(async () => {
    setStatus("idle");
    try {
      await writeToClipboard(code);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  }, [code]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
      aria-label="Copiar código do pré-sermão"
    >
      {label}
    </button>
  );
}

