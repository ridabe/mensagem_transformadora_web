"use client";

import { useState } from "react";

type Props = {
  planCode: string;
  className?: string;
  label: string;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function CreateCheckoutButton({ planCode, className, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onClick() {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode }),
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
        setErrorMessage(message ?? "Não foi possível iniciar sua assinatura agora. Tente novamente.");
        return;
      }

      const checkoutUrl =
        payload && typeof payload === "object" && "checkoutUrl" in payload
          ? getString((payload as Record<string, unknown>).checkoutUrl)
          : null;
      if (!checkoutUrl) {
        setErrorMessage("Não foi possível iniciar sua assinatura agora. Tente novamente.");
        return;
      }

      window.location.href = checkoutUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={
          className ??
          "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mt-gold)]/40 disabled:cursor-not-allowed disabled:opacity-60 [background:var(--mt-gradient-gold)]"
        }
      >
        {loading ? "Iniciando..." : label}
      </button>
      {errorMessage ? <p className="text-xs font-semibold text-red-600 dark:text-red-300">{errorMessage}</p> : null}
    </div>
  );
}
