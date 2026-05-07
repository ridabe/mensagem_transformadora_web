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
    <div
      className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)]"
      style={{ boxShadow: 'var(--mt-shadow-md)' }}
    >
      <ul className="divide-y divide-[var(--mt-border)]">
        {preachers.map((preacher) => (
          <li key={preacher.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mt-navy)]">
                      <span className="text-sm font-medium text-[var(--mt-text)]">
                        {preacher.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-[var(--mt-text)]">
                        {preacher.display_name}
                      </h3>
                      <ChurchRoleBadge role={preacher.role} />
                    </div>
                    <p className="text-sm text-[var(--mt-text-secondary)]">{preacher.email}</p>
                    {preacher.ministry_title && (
                      <p className="text-sm text-[var(--mt-text-secondary)]">
                        Função: {preacher.ministry_title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    preacher.status === 'active'
                      ? 'bg-[var(--mt-success-bg)] text-[var(--mt-success)] border border-[var(--mt-success-border)]'
                      : 'bg-[var(--mt-error-bg)] text-[var(--mt-error)] border border-[var(--mt-error-border)]'
                  }`}>
                    {preacher.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                  <span className="text-sm text-[var(--mt-text-secondary)]">
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
                              className="text-sm font-medium text-[var(--mt-warning)] transition-colors duration-200 hover:text-[var(--mt-white)]"
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
                              className="text-sm font-medium text-[var(--mt-info)] transition-colors duration-200 hover:text-[var(--mt-white)]"
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
                            className="text-sm font-medium text-[var(--mt-error)] transition-colors duration-200 hover:text-[var(--mt-white)]"
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
                          className="text-sm font-medium text-[var(--mt-info)] transition-colors duration-200 hover:text-[var(--mt-white)]"
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
