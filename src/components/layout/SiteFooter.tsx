export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--mt-border)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[var(--mt-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>Mensagem Transformadora</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>Sobre</span>
          <span>Política de Privacidade</span>
          <span>Contato</span>
          <span>Desenvolvedor</span>
        </div>
      </div>
    </footer>
  );
}

