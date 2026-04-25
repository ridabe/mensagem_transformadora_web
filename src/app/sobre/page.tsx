export const metadata = {
  title: "Sobre",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sobre o projeto</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          A plataforma web Mensagem Transformadora é a extensão online do app
          Android Mensagem Transformadora. O app continua sendo offline-first e
          nada é publicado automaticamente.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">O que a web faz</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Publica mensagens enviadas pelo app, de forma explícita e opcional.</li>
          <li>Organiza e exibe mensagens públicas com URL compartilhável.</li>
          <li>Entrega uma leitura premium, responsiva e otimizada para SEO.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">Privacidade e confiança</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Suas mensagens continuam privadas no app. Elas só aparecem no site
          quando você clicar em “Publicar no site” no aplicativo.
        </p>
      </section>
    </main>
  );
}

