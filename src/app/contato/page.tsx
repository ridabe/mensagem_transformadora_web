export const metadata = {
  title: "Contato",
  description:
    "Entre em contato com a equipe da Mensagem Transformadora. Estamos prontos para ajudar pastores e líderes a maximizar o uso da plataforma.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Fale conosco</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Estamos aqui para ajudá-lo. Se você tiver dúvidas, sugestões, precisar
          de suporte ou quiser saber mais sobre a plataforma, entre em contato —
          será um prazer atendê-lo.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">Um convite especial</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A <strong className="text-[var(--mt-text)]">Mensagem Transformadora</strong> nasceu
          para servir pastores, pregadores e líderes que desejam organizar e
          compartilhar a Palavra com excelência. Se você quer tirar o máximo da
          plataforma, tem ideias para melhorá-la ou simplesmente precisa de
          ajuda, nossa equipe está disponível e ansiosa para ouvir você.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Não hesite em nos escrever — toda mensagem recebe atenção e
          resposta. Você faz parte desta comunidade e a sua experiência importa.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:suporte@mensagemtransformadora.com.br"
          className="group flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6 transition-colors hover:border-[var(--mt-gold)] hover:bg-[var(--mt-surface-elevated)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mt-gold)]/10">
            <svg
              className="h-5 w-5 text-[var(--mt-gold)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-[var(--mt-text)]">E-mail de suporte</p>
            <p className="break-all text-sm text-[var(--mt-gold)] group-hover:underline">
              suporte@mensagemtransformadora.com.br
            </p>
            <p className="mt-1 text-xs text-[var(--mt-muted)]">
              Para dúvidas, suporte técnico e solicitações gerais.
            </p>
          </div>
        </a>

        <a
          href="https://instagram.com/mensagemtransformadora"
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6 transition-colors hover:border-[var(--mt-gold)] hover:bg-[var(--mt-surface-elevated)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mt-gold)]/10">
            <svg
              className="h-5 w-5 text-[var(--mt-gold)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-[var(--mt-text)]">Instagram</p>
            <p className="text-sm text-[var(--mt-gold)] group-hover:underline">
              @mensagemtransformadora
            </p>
            <p className="mt-1 text-xs text-[var(--mt-muted)]">
              Acompanhe novidades, conteúdos e atualizações da plataforma.
            </p>
          </div>
        </a>
      </div>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">Tempo de resposta</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Nosso compromisso é responder todas as mensagens de e-mail em até{" "}
          <strong className="text-[var(--mt-text)]">2 dias úteis</strong>. Para
          assuntos urgentes de suporte, procure-nos diretamente pelo Instagram.
          Fazemos o possível para atender a todos com atenção e agilidade.
        </p>
      </section>
    </main>
  );
}
