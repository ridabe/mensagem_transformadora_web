import Link from 'next/link'
import { ChurchService } from '@/lib/church'
import ChurchPreachersTable from '@/components/features/church/ChurchPreachersTable'
import EmptyPreachersState from '@/components/features/church/EmptyPreachersState'

export default async function ChurchPreachersPage() {
  const churchService = new ChurchService()
  const { church } = await churchService.assertChurchAdmin()
  const canSetChurchAdminRole =
    church.status === 'active' && church.plan_type === 'business' && church.plan_status === 'active'

  const preachers = await churchService.getChurchPreachers()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preleitores — {church.name}</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os preleitores da igreja {church.name}
          </p>
        </div>
        <Link
          href="/igreja/preleitores/novo"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Adicionar Preleitor
        </Link>
      </div>

      {preachers.length === 0 ? (
        <EmptyPreachersState churchName={church.name} />
      ) : (
        <ChurchPreachersTable preachers={preachers} canSetChurchAdminRole={canSetChurchAdminRole} />
      )}
    </div>
  )
}
