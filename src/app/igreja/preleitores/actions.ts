'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ChurchService } from '@/lib/church'

export async function createChurchPreacher(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const ministryTitle = formData.get('ministryTitle') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validações básicas
  if (!name?.trim()) {
    throw new Error('Nome é obrigatório')
  }

  if (!email?.trim()) {
    throw new Error('E-mail é obrigatório')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('E-mail inválido')
  }

  if (!password || password.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres')
  }

  if (password !== confirmPassword) {
    throw new Error('Senhas não coincidem')
  }

  try {
    const churchService = new ChurchService()
    await churchService.createChurchPreacher({
      name: name.trim(),
      email: email.trim(),
      ministryTitle: ministryTitle?.trim() || undefined,
      password
    })

    revalidatePath('/igreja/preleitores')
    redirect('/igreja/preleitores')
  } catch (error) {
    throw new Error('Erro ao criar preleitor: ' + (error as Error).message)
  }
}

export async function promoteChurchAdmin(formData: FormData) {
  const preacherId = formData.get('preacherId') as string

  try {
    const churchService = new ChurchService()
    await churchService.promoteUserToChurchAdmin(preacherId)
    revalidatePath('/igreja/preleitores')
  } catch (error) {
    throw new Error('Erro ao promover administrador da igreja: ' + (error as Error).message)
  }
}

export async function demoteChurchAdmin(formData: FormData) {
  const preacherId = formData.get('preacherId') as string

  try {
    const churchService = new ChurchService()
    await churchService.demoteUserFromChurchAdmin(preacherId)
    revalidatePath('/igreja/preleitores')
  } catch (error) {
    throw new Error('Erro ao remover papel de administrador da igreja: ' + (error as Error).message)
  }
}

export async function deactivateChurchPreacher(formData: FormData) {
  const preacherId = formData.get('preacherId') as string

  try {
    const churchService = new ChurchService()
    await churchService.deactivateChurchPreacher(preacherId)
    revalidatePath('/igreja/preleitores')
  } catch (error) {
    throw new Error('Erro ao desativar preleitor: ' + (error as Error).message)
  }
}

export async function removeChurchPreacher(formData: FormData) {
  const preacherId = formData.get('preacherId') as string

  try {
    const churchService = new ChurchService()
    await churchService.removePreacherFromChurch(preacherId)
    revalidatePath('/igreja/preleitores')
  } catch (error) {
    throw new Error('Erro ao remover preleitor: ' + (error as Error).message)
  }
}