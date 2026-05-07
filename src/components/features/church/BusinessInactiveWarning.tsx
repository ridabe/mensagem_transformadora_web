export default function BusinessInactiveWarning() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-[var(--mt-night)] py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-[var(--mt-warning)]">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--mt-text)]">
            Acesso Restrito
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--mt-text-secondary)]">
            Esta funcionalidade está disponível apenas para igrejas com Plano Business ativo.
          </p>
          <div className="mt-8">
            <div className="rounded-xl bg-[var(--mt-warning-bg)] p-4 border border-[var(--mt-warning-border)]">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-[var(--mt-warning)]">
                    Plano Business Necessário
                  </h3>
                  <div className="mt-2 text-sm text-[var(--mt-text-secondary)]">
                    <p>
                      Para acessar a área institucional da igreja e gerenciar múltiplos preleitores,
                      é necessário ter o Plano Business ativo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <a
              href="/lider"
              className="font-medium text-[var(--mt-gold)] transition-colors duration-200 hover:text-[var(--mt-white)]"
            >
              ← Voltar para Área do Líder
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
