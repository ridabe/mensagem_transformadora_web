export const metadata = {
  title: "Desenvolvedor",
};

export default function DesenvolvedorPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-3">
          <div className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/95 px-3 py-2 shadow-sm shadow-black/10 backdrop-blur dark:border-white/10 dark:bg-white/90">
            <svg
              width="120"
              height="40"
              viewBox="0 0 120 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Algoritmum Brasil"
              role="img"
            >
              <defs>
                <linearGradient id="compactGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity="1" />
                  <stop offset="50%" stopColor="#0099CC" stopOpacity="1" />
                  <stop offset="100%" stopColor="#6B46C1" stopOpacity="1" />
                </linearGradient>
              </defs>
              <g transform="translate(2, 2)">
                <path
                  d="M18 6 L32 32 L26 32 L24 26 L12 26 L10 32 L4 32 L18 6 Z"
                  fill="url(#compactGradient)"
                  stroke="none"
                />
                <rect x="15" y="20" width="6" height="2" fill="white" rx="1" />
                <circle cx="10" cy="18" r="1.5" fill="url(#compactGradient)" />
                <circle cx="26" cy="18" r="1.5" fill="url(#compactGradient)" />
                <circle cx="18" cy="25" r="1.5" fill="url(#compactGradient)" />
                <line
                  x1="10"
                  y1="18"
                  x2="16"
                  y2="21"
                  stroke="url(#compactGradient)"
                  strokeWidth="1"
                  opacity="0.7"
                />
                <line
                  x1="26"
                  y1="18"
                  x2="20"
                  y2="21"
                  stroke="url(#compactGradient)"
                  strokeWidth="1"
                  opacity="0.7"
                />
                <line
                  x1="18"
                  y1="25"
                  x2="18"
                  y2="22"
                  stroke="url(#compactGradient)"
                  strokeWidth="1"
                  opacity="0.7"
                />
              </g>
              <text
                x="40"
                y="18"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize="14"
                fontWeight="700"
                fill="#1E293B"
              >
                Algoritmum
              </text>
              <text
                x="40"
                y="30"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize="10"
                fontWeight="500"
                fill="#64748B"
              >
                Brasil
              </text>
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-semibold tracking-tight">Desenvolvedor</h1>
            <p className="text-sm leading-6 text-[var(--mt-muted)]">
              Algoritmum Desenvolvimento •{" "}
              <a
                className="hover:underline"
                href="https://www.algoritmumbrasil.com.br"
                target="_blank"
                rel="noreferrer"
              >
                www.algoritmumbrasil.com.br
              </a>
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">Sobre a empresa</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A Algoritmum Desenvolvimento é uma startup brasileira focada em desenvolvimento de
          software, automação de processos e soluções digitais para empresas. O objetivo é entregar
          tecnologia de ponta com execução ágil e qualidade de engenharia, transformando processos em
          produtos digitais escaláveis.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A empresa fundada em 2010 e com atuação nacional, com base em São Paulo
          (SP).
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">O que a Algoritmum faz</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Algoritmum atua em frentes de atuação voltadas a construção e evolução
          de produtos digitais, arquitetura e automação:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Produtos digitais (aplicações web, apps mobile, PWAs e e-commerce)</li>
          <li>Arquitetura (microserviços, APIs REST/GraphQL, serverless e integrações)</li>
          <li>RPA e automação de processos (workflows e processamento de documentos)</li>
          <li>Data e IA (BI, data warehousing, machine learning e análises preditivas)</li>
          <li>Cloud e DevOps (CI/CD, Docker/K8s e monitoramento)</li>
          <li>Consultoria (estratégia digital, auditoria e gestão)</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">Produtos citados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A empresa administra produtos e iniciativas próprias, incluindo:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Monetrix (sistema de gestão financeira)</li>
          <li>RPA Suite (em desenvolvimento)</li>
          <li>Mensagem Transformadora (Web e App) </li>
          <li>Data &amp; IA Workbench (em desenvolvimento)</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">Contato</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Para falar com a Algoritmum Desenvolvimento:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>
            E-mail:{" "}
            <a className="hover:underline" href="mailto:contato@algoritmumbrasil.com.br">
              contato@algoritmumbrasil.com.br
            </a>
          </li>
          <li>
            Suporte:{" "}
            <a className="hover:underline" href="mailto:suporte@algoritmumbrasil.com.br">
              suporte@algoritmumbrasil.com.br
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
