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

    if (church.status !== 'active') {
      throw new Error('Igreja não está ativa')
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

  async getChurchMembers(): Promise<Profile[]> {
    const { church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const { data: members, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Erro ao buscar membros da igreja')
    }

    return members || []
  }

  async getChurchAdmins(): Promise<Profile[]> {
    const { church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const { data: admins, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('church_id', church.id)
      .eq('role', 'church_admin')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Erro ao buscar administradores da igreja')
    }

    return admins || []
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

  async getCurrentProfile(): Promise<Profile> {
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

    return profile
  }

  async getProfileById(profileId: string): Promise<Profile> {
    const supabase = await this.getSupabase()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      throw new Error('Perfil não encontrado')
    }

    return profile
  }

  async promoteUserToChurchAdmin(profileId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const currentProfile = await this.getCurrentProfile()
    const targetProfile = await this.getProfileById(profileId)

    if (!targetProfile.church_id) {
      throw new Error('Usuário não pertence a nenhuma igreja')
    }

    if (targetProfile.role === 'admin') {
      throw new Error('Não é possível promover um Admin Global')
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', targetProfile.church_id)
      .single()

    if (churchError || !church) {
      throw new Error('Igreja não encontrada')
    }

    if (church.status !== 'active') {
      throw new Error('Igreja não está ativa')
    }

    if (church.plan_type !== 'business' || church.plan_status !== 'active') {
      throw new Error('Igreja não possui plano Business ativo')
    }

    if (currentProfile.role === 'leader') {
      throw new Error('Acesso negado: usuário não tem permissão para promover')
    }

    if (currentProfile.role === 'church_admin' && currentProfile.church_id !== targetProfile.church_id) {
      throw new Error('Acesso negado: só é possível promover usuários da própria igreja')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'church_admin' })
      .eq('id', profileId)
      .eq('church_id', targetProfile.church_id)

    if (error) {
      throw new Error('Erro ao promover usuário')
    }
  }

  /**
   * Remove papel de church_admin (apenas Admin Global)
   */
  async demoteUserFromChurchAdmin(profileId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const currentProfile = await this.getCurrentProfile()
    const targetProfile = await this.getProfileById(profileId)

    if (targetProfile.role !== 'church_admin') {
      throw new Error('Usuário não é administrador da igreja')
    }

    if (!targetProfile.church_id) {
      throw new Error('Usuário não pertence a uma igreja')
    }

    if (currentProfile.role === 'leader') {
      throw new Error('Acesso negado: usuário não tem permissão para remover administrador')
    }

    if (currentProfile.role === 'church_admin' && currentProfile.church_id !== targetProfile.church_id) {
      throw new Error('Acesso negado: só é possível remover administradores da própria igreja')
    }

    const { data: activeAdmins, error: activeAdminsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('church_id', targetProfile.church_id)
      .eq('role', 'church_admin')
      .eq('status', 'active')

    if (activeAdminsError) {
      throw new Error('Erro ao verificar administradores da igreja')
    }

    if ((activeAdmins?.length ?? 0) <= 1) {
      throw new Error('Esta igreja precisa ter pelo menos um administrador ativo.')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'leader' })
      .eq('id', profileId)
      .eq('role', 'church_admin')

    if (error) {
      throw new Error('Erro ao rebaixar usuário')
    }
  }
}