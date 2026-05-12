"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RichTextFieldProps = {
  name: string;
  initialHtml?: string | null;
  placeholder?: string;
  minHeightClassName?: string;
};

function isProbablyUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("http://") || v.startsWith("https://")) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(v);
}

function normalizeUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

export function RichTextField({
  name,
  initialHtml,
  placeholder,
  minHeightClassName,
}: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState<string>(String(initialHtml ?? ""));
  const [focused, setFocused] = useState(false);

  const minHeight = minHeightClassName ?? "min-h-[240px]";

  const exec = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setHtml(editorRef.current.innerHTML);
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedHtml = e.clipboardData.getData("text/html");
    if (pastedHtml) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = pastedHtml;
      wrapper.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
        const cleaned = (el.getAttribute("style") ?? "")
          .split(";")
          .filter((s) => !/^\s*(color|background(-color)?)\s*:/i.test(s))
          .join(";")
          .trim();
        if (cleaned) {
          el.setAttribute("style", cleaned);
        } else {
          el.removeAttribute("style");
        }
      });
      wrapper.querySelectorAll("[color]").forEach((el) => el.removeAttribute("color"));
      wrapper.querySelectorAll("font").forEach((el) => el.removeAttribute("color"));
      document.execCommand("insertHTML", false, wrapper.innerHTML);
    } else {
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }, []);

  const onLink = useCallback(() => {
    const urlRaw = window.prompt("Link (https://...)", "");
    if (!urlRaw) return;
    if (!isProbablyUrl(urlRaw)) return;
    exec("createLink", normalizeUrl(urlRaw));
  }, [exec]);

  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerHTML;
    const next = String(initialHtml ?? "");
    if (current !== next) {
      editorRef.current.innerHTML = next;
      setHtml(next);
    }
  }, [initialHtml]);

  const onInput = useCallback(() => {
    if (!editorRef.current) return;
    setHtml(editorRef.current.innerHTML);
  }, []);

  const showPlaceholder = !focused && !String(html ?? "").replaceAll(/<[^>]*>/g, "").trim();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
        >
          Negrito
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
        >
          Itálico
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
        >
          Sublinhado
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
        >
          1. 2. 3.
        </button>
        <button
          type="button"
          onClick={onLink}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
        >
          Link
        </button>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={onInput}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          suppressContentEditableWarning
          style={{ color: "var(--mt-text)" }}
          className={[
            "w-full rounded-2xl border bg-[var(--mt-surface)] px-4 py-3 text-sm leading-7 outline-none",
            "border-[var(--mt-border)]",
            focused ? "ring-2 ring-[var(--mt-amber)]" : "",
            minHeight,
          ].join(" ")}
        />
        {showPlaceholder ? (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-[var(--mt-muted)]">
            {placeholder ?? "Escreva seu conteúdo..."}
          </div>
        ) : null}
      </div>

      <textarea name={name} value={html} readOnly className="hidden" />
    </div>
  );
}
