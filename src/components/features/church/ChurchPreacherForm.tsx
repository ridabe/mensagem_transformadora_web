import { createChurchPreacher } from '@/app/igreja/preleitores/actions'

export default function ChurchPreacherForm(props: { canSetChurchAdminRole?: boolean }) {
  const canSetChurchAdminRole = props.canSetChurchAdminRole === true

  return (
    <form action={createChurchPreacher} className="space-y-6">
      <div>
        <label htmlFor="name" className="form-label">
          Nome Completo *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="form-input w-full"
        />
      </div>

      <div>
        <label htmlFor="email" className="form-label">
          E-mail *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="form-input w-full"
        />
      </div>

      <div>
        <label htmlFor="ministryTitle" className="form-label">
          Função Ministerial
        </label>
        <select
          id="ministryTitle"
          name="ministryTitle"
          className="form-input w-full"
          defaultValue=""
        >
          <option value="">Selecione (opcional)</option>
          <option value="pastor">Pr. — Pastor</option>
          <option value="diacono">Diácono</option>
          <option value="bispo">Bispo</option>
          <option value="apostolo">Apóstolo</option>
          <option value="missionario">Missionário</option>
          <option value="pregador">Pregador</option>
          <option value="lider">Líder</option>
        </select>
      </div>

      <div>
        <label htmlFor="accessType" className="form-label">
          Tipo de Acesso *
        </label>
        <select
          id="accessType"
          name="accessType"
          required
          className="form-input w-full"
          defaultValue="leader"
        >
          <option value="leader">Líder comum</option>
          {canSetChurchAdminRole ? (
            <option value="church_admin">Admin da Igreja</option>
          ) : null}
        </select>
      </div>

      <div>
        <label htmlFor="password" className="form-label">
          Senha Temporária *
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={6}
          className="form-input w-full"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="form-label">
          Confirmar Senha *
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          required
          className="form-input w-full"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <a
          href="/igreja/preleitores"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-6 text-sm font-semibold text-[var(--mt-white)] transition hover:bg-[var(--mt-surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-gold)]/30"
        >
          Cancelar
        </a>
        <button
          type="submit"
          className="form-button w-full sm:w-auto"
        >
          Criar Preleitor
        </button>
      </div>
    </form>
  )
}
