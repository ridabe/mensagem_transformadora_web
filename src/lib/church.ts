import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

type Profile = {
  id: string
  auth_user_id: string
  name: string
  display_name: string
  email: string
  ministry_title?: string
  role: string
  church_id?: string
  status: string
  created_at: string
  updated_at: string
}

type Church = {
  id: string
  name: string
  city?: string
  state?: string
  status: string
  plan_type?: string
  plan_status?: string
  created_at: string
  updated_at: string
}

export class ChurchService {
  private async getSupabase() {
    return await createClient()
  }

  private async getAdminSupabase() {
    return createServiceRoleClient()
  }

  /**
   * Verifica se o usuário logado é church_admin da igreja ativa com plano business
   */
  async assertChurchAdmin(): Promise<{ profile: Profile; church: Church }> {
    const supabase = await this.getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Perfil não encontrado')
    }

    if (profile.role !== 'church_admin') {
      throw new Error('Acesso negado: usuário não é administrador da igreja')
    }

    if (!profile.church_id) {
      throw new Error('Acesso negado: usuário não está associado a uma igreja')
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', profile.church_id)
      .single()

    if (churchError || !church) {
      throw new Error('Igreja não encontrada')
    }

    if (church.plan_type !== 'business' || church.plan_status !== 'active') {
      throw new Error('Acesso negado: igreja não possui plano Business ativo')
    }

    return { profile, church }
  }

  /**
   * Verifica se a igreja tem plano Business ativo
   */
  async assertBusinessChurchActive(churchId: string): Promise<Church> {
    const supabase = await this.getSupabase()
    const { data: church, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', churchId)
      .single()

    if (error || !church) {
      throw new Error('Igreja não encontrada')
    }

    if (church.plan_type !== 'business' || church.plan_status !== 'active') {
      throw new Error('Igreja não possui plano Business ativo')
    }

    return church
  }

  /**
   * Obtém a igreja do usuário logado
   */
  async getCurrentUserChurch(): Promise<{ profile: Profile; church: Church }> {
    const supabase = await this.getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile || !profile.church_id) {
      throw new Error('Usuário não está associado a uma igreja')
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', profile.church_id)
      .single()

    if (churchError || !church) {
      throw new Error('Igreja não encontrada')
    }

    return { profile, church }
  }

  /**
   * Lista preleitores da igreja (church_admin)
   */
  async getChurchPreachers(): Promise<Profile[]> {
    const { church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const { data: preachers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('church_id', church.id)
      .neq('role', 'church_admin') // Não incluir outros church_admins na lista
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Erro ao buscar preleitores')
    }

    return preachers || []
  }

  /**
   * Cria um novo preleitor diretamente (server-side)
   */
  async createChurchPreacher(data: {
    name: string
    email: string
    ministryTitle?: string
    password: string
  }): Promise<Profile> {
    const { church } = await this.assertChurchAdmin()
    const adminSupabase = await this.getAdminSupabase()

    // Validar e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw new Error('E-mail inválido')
    }

    // Verificar se e-mail já existe
    const { data: existingUser } = await adminSupabase.auth.admin.listUsers()
    const userExists = existingUser.users.some(u => u.email === data.email)
    if (userExists) {
      throw new Error('E-mail já cadastrado no sistema')
    }

    // Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Confirmar e-mail automaticamente
      user_metadata: {
        name: data.name,
        ministry_title: data.ministryTitle,
      }
    })

    if (authError || !authUser.user) {
      throw new Error('Erro ao criar usuário: ' + authError?.message)
    }

    // Criar perfil
    const { data: newProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        auth_user_id: authUser.user.id,
        name: data.name,
        display_name: data.name,
        email: data.email,
        ministry_title: data.ministryTitle,
        role: 'leader',
        church_id: church.id,
        status: 'active',
      })
      .select()
      .single()

    if (profileError || !newProfile) {
      // Se falhar, tentar deletar o usuário criado
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error('Erro ao criar perfil: ' + profileError?.message)
    }

    return newProfile
  }

  /**
   * Desativa um preleitor da igreja
   */
  async deactivateChurchPreacher(preacherId: string): Promise<void> {
    const { church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'blocked' })
      .eq('id', preacherId)
      .eq('church_id', church.id)
      .neq('role', 'church_admin') // Não pode desativar outro church_admin

    if (error) {
      throw new Error('Erro ao desativar preleitor')
    }
  }

  /**
   * Remove vínculo do preleitor com a igreja (seta church_id para null)
   */
  async removePreacherFromChurch(preacherId: string): Promise<void> {
    const { church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('profiles')
      .update({ church_id: null, status: 'active' })
      .eq('id', preacherId)
      .eq('church_id', church.id)
      .neq('role', 'church_admin') // Não pode remover outro church_admin

    if (error) {
      throw new Error('Erro ao remover preleitor da igreja')
    }
  }

  /**
   * Promove um usuário a church_admin (apenas Admin Global)
   */
  async promoteToChurchAdmin(userId: string, churchId: string): Promise<void> {
    const supabase = await this.getSupabase()
    // Verificar se é Admin Global
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Acesso negado: apenas Admin Global pode promover usuários')
    }

    // Verificar igreja
    await this.assertBusinessChurchActive(churchId)

    // Promover
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'church_admin', church_id: churchId })
      .eq('id', userId)

    if (error) {
      throw new Error('Erro ao promover usuário')
    }
  }

  /**
   * Remove papel de church_admin (apenas Admin Global)
   */
  async demoteChurchAdmin(userId: string): Promise<void> {
    const supabase = await this.getSupabase()
    // Verificar se é Admin Global
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Acesso negado: apenas Admin Global pode rebaixar usuários')
    }

    // Rebaixar para leader
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'leader' })
      .eq('id', userId)
      .eq('role', 'church_admin')

    if (error) {
      throw new Error('Erro ao rebaixar usuário')
    }
  }
}