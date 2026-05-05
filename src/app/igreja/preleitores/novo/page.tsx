import ChurchPreacherForm from '@/components/features/church/ChurchPreacherForm'

export default function NewChurchPreacherPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Adicionar Preleitor</h1>
        <p className="text-gray-600 mt-1">
          Cadastre um novo preleitor para sua igreja
        </p>
      </div>

      <ChurchPreacherForm />
    </div>
  )
}