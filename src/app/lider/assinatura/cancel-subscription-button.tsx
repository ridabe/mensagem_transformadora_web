"use client";

import { useState } from "react";

type Props = {
  className?: string;
  label?: string;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function CancelSubscriptionButton({ className, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onClick() {
    if (loading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar sua assinatura? Essa ação não pode ser desfeita e novas cobranças serão interrompidas. Para voltar ao plano pago será necessário contratar novamente.",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      const payload: unknown = await res.json().catch(() => null);
      const success =
        payload && typeof payload === "object" && "success" in payload ? Boolean(payload.success) : false;

      if (!success) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          payload.error &&
          typeof payload.error === "object" &&
          "message" in payload.error
            ? getString((payload.error as Record<string, unknown>).message)
            : null;
        setErrorMessage(message ?? "Não foi possível cancelar sua assinatura agora. Tente novamente.");
        return;
      }

      setSuccessMessage("Assinatura cancelada com sucesso.");
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300"
      >
        {loading ? "Cancelando..." : label ?? "Cancelar assinatura"}
      </button>
      {errorMessage ? (
        <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}

