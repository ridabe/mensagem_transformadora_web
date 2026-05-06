import { ChurchService } from '@/lib/church'
import ChurchDashboardCard from '@/components/features/church/ChurchDashboardCard'

export default async function ChurchDashboardPage() {
  const churchService = new ChurchService()
  const { church } = await churchService.assertChurchAdmin()

  const preachers = await churchService.getChurchPreachers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard da Igreja — {church.name}</h1>
        <p className="text-gray-600 mt-1">
          Gerencie os preleitores e recursos da igreja {church.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChurchDashboardCard
          title="Preleitores"
          value={preachers.length}
          description={`Preleitores ativos em ${church.name}`}
          href="/igreja/preleitores"
        />

        <ChurchDashboardCard
          title="Plano"
          value="Business"
          description={`Plano ativo em ${church.name}`}
          href="#"
        />

        <ChurchDashboardCard
          title="Status"
          value="Ativo"
          description={`Igreja ${church.name} ativa`}
          href="#"
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Informações da Igreja — {church.name}
        </h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Nome</dt>
            <dd className="mt-1 text-sm text-gray-900">{church.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cidade</dt>
            <dd className="mt-1 text-sm text-gray-900">{church.city || 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Estado</dt>
            <dd className="mt-1 text-sm text-gray-900">{church.state || 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{church.status}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
