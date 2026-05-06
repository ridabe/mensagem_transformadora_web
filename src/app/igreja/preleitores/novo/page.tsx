import ChurchPreacherForm from '@/components/features/church/ChurchPreacherForm'
import { ChurchService } from '@/lib/church'

export default async function NewChurchPreacherPage() {
  const churchService = new ChurchService()
  const { church } = await churchService.assertChurchAdmin()
  const canSetChurchAdminRole =
    church.status === 'active' && church.plan_type === 'business' && church.plan_status === 'active'

  return (
    <main className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <p className="text-sm text-[var(--mt-blue-light)]">Área da Igreja • {church.name} • Preleitores</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--mt-white)]">
          Adicionar preletor — {church.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--mt-blue-light)]">
          Cadastre um novo preletor para a igreja {church.name}
        </p>
      </header>

      <section className="rounded-3xl border border-[var(--mt-border)] bg-[var(--mt-blue-medium)] p-6 shadow-xl shadow-black/5">
        <ChurchPreacherForm canSetChurchAdminRole={canSetChurchAdminRole} />
      </section>
    </main>
  )
}
