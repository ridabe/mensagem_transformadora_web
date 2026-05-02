import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--mt-border)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[var(--mt-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>Mensagem Transformadora</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/sobre" className="hover:text-[var(--mt-text)] hover:underline">
            Sobre
          </Link>
          <Link href="/privacidade" className="hover:text-[var(--mt-text)] hover:underline">
            Política de Privacidade
          </Link>
          <Link href="/termos" className="hover:text-[var(--mt-text)] hover:underline">
            Termos de Uso
          </Link>
          <span>Contato</span>
          <Link href="/desenvolvedor" className="hover:text-[var(--mt-text)] hover:underline">
            Desenvolvedor
          </Link>
        </div>
      </div>
    </footer>
  );
}

