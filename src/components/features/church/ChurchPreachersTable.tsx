'use client'

import { deactivateChurchPreacher, demoteChurchAdmin, removeChurchPreacher, promoteChurchAdmin } from '@/app/igreja/preleitores/actions'
import ChurchRoleBadge from './ChurchRoleBadge'

type Profile = {
  id: string
  display_name: string
  email: string
  ministry_title?: string
  role: string
  status: string
  created_at: string
}

interface ChurchPreachersTableProps {
  preachers: Profile[]
  canSetChurchAdminRole?: boolean
}

export default function ChurchPreachersTable({ preachers, canSetChurchAdminRole }: ChurchPreachersTableProps) {
  const showChurchAdminActions = canSetChurchAdminRole === true

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {preachers.map((preacher) => (
          <li key={preacher.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {preacher.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {preacher.display_name}
                      </h3>
                      <ChurchRoleBadge role={preacher.role} />
                    </div>
                    <p className="text-sm text-gray-500">{preacher.email}</p>
                    {preacher.ministry_title && (
                      <p className="text-sm text-gray-500">
                        Função: {preacher.ministry_title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    preacher.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {preacher.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(preacher.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex space-x-2">
                    {preacher.status === 'active' ? (
                      <>
                        {preacher.role === 'church_admin' ? (
                          <form action={demoteChurchAdmin}>
                            <input type="hidden" name="preacherId" value={preacher.id} />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (!confirm('Tem certeza que deseja remover o papel de administrador desta igreja?')) {
                                  e.preventDefault()
                                }
                              }}
                              className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                            >
                              Remover admin da igreja
                            </button>
                          </form>
                        ) : showChurchAdminActions ? (
                          <form action={promoteChurchAdmin}>
                            <input type="hidden" name="preacherId" value={preacher.id} />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (!confirm('Tem certeza que deseja tornar este usuário administrador da igreja?')) {
                                  e.preventDefault()
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Tornar admin da igreja
                            </button>
                          </form>
                        ) : null}
                        <form action={deactivateChurchPreacher}>
                          <input type="hidden" name="preacherId" value={preacher.id} />
                          <button
                            type="submit"
                            onClick={(e) => {
                              if (!confirm('Tem certeza que deseja desativar este preleitor?')) {
                                e.preventDefault()
                              }
                            }}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Desativar
                          </button>
                        </form>
                      </>
                    ) : (
                      <form action={removeChurchPreacher}>
                        <input type="hidden" name="preacherId" value={preacher.id} />
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (!confirm('Tem certeza que deseja remover este preleitor da igreja? Ele perderá acesso aos recursos institucionais.')) {
                              e.preventDefault()
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Remover
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
