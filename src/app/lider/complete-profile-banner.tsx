import { updateMinistryTitle } from "./actions";

export function CompleteProfileBanner() {
  return (
    <div className="rounded-2xl border border-amber-600/40 bg-amber-950/30 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-300">Complete seu perfil</p>
          <p className="mt-0.5 text-xs text-amber-200/70">
            Selecione sua função ministerial para personalizar sua experiência.
          </p>
        </div>
        <form action={updateMinistryTitle} className="flex shrink-0 items-center gap-2">
          <select
            name="ministry_title"
            required
            defaultValue=""
            className="h-9 rounded-xl border border-amber-600/30 bg-amber-950/50 px-3 text-sm text-amber-100 focus:outline-none"
          >
            <option value="" disabled>Selecione</option>
            <option value="pastor">Pastor</option>
            <option value="diacono">Diácono</option>
            <option value="bispo">Bispo</option>
            <option value="apostolo">Apóstolo</option>
            <option value="missionario">Missionário</option>
            <option value="pregador">Pregador</option>
            <option value="lider">Líder</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}
