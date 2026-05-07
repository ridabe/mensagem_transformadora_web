import Link from 'next/link'

export default function EmptyPreachersState(props: { churchName: string }) {
  const name = props.churchName?.trim() ? props.churchName.trim() : 'sua igreja'
  return (
    <div className="py-12 text-center">
      <div className="mx-auto h-12 w-12 text-[var(--mt-text-secondary)]">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-[var(--mt-text)]">
        Nenhum preleitor cadastrado em {name}
      </h3>
      <p className="mt-1 text-sm text-[var(--mt-text-secondary)]">
        Comece adicionando o primeiro preleitor à igreja {name}.
      </p>
      <div className="mt-6">
        <Link
          href="/igreja/preleitores/novo"
          className="btn btn-primary btn-md inline-flex"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Adicionar Preleitor
        </Link>
      </div>
    </div>
  )
}
