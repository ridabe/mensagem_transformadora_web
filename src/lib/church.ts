import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildSiteUrl } from '@/app/api/_shared/slug'
import crypto from 'node:crypto'

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

type ChurchInvitationRole = 'leader' | 'church_admin'
type ChurchInvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired'

type ChurchInvitation = {
  id: string
  church_id: string
  invited_by: string
  email: string
  name: string | null
  ministry_title: string | null
  role: ChurchInvitationRole
  status: ChurchInvitationStatus
  token: string
  expires_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type PublicationChurchMeta = {
  churchId: string
  churchName: string
}

/**
 * Resolve a identidade institucional para uma publicação.
 * Retorna os dados da igreja somente se ela estiver ativa com plano Business ativo.
 * Fallback: retorna null (publicação segue comportamento padrão sem vínculo institucional).
 */
export async function resolvePublicationChurch(churchId: string | null): Promise<PublicationChurchMeta | null> {
  if (!churchId) return null

  const service = createServiceRoleClient()
  const { data: church, error } = await service
    .from('churches')
    .select('id,name,status,plan_type,plan_status')
    .eq('id', churchId)
    .maybeSingle<{ id: string; name: string; status: string; plan_type: string | null; plan_status: string | null }>()

  if (error || !church?.id) return null

  const status = String(church.status ?? '').trim().toLowerCase()
  const planType = String(church.plan_type ?? '').trim().toLowerCase()
  const planStatus = String(church.plan_status ?? '').trim().toLowerCase()

  if (status !== 'active' || planType !== 'business' || planStatus !== 'active') return null

  const name = typeof church.name === 'string' && church.name.trim() ? church.name.trim() : null
  if (!name) return null

  return { churchId: church.id, churchName: name }
}

export class ChurchService {
  private readonly churchAdminOptionMessage =
    'Esta opção só está disponível para líderes associados a uma igreja com Plano Business ativo.'
  private readonly businessOnlyActionMessage =
    'Essa ação está disponível apenas para igrejas com Plano Business ativo.'

  private async getSupabase() {
    return await createClient()
  }

  private async getAdminSupabase() {
    return createServiceRoleClient()
  }

  private normalizeChurchFlag(value: unknown): string {
    return String(value ?? '').trim().toLowerCase()
  }

  /**
   * Verifica se o usuário logado é church_admin da igreja ativa com plano business
   */
  async assertChurchAdmin(): Promise<{ profile: Profile; church: Church }> {
    const supabase = await this.getSupabase()
    const adminSupabase = await this.getAdminSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      throw new Error('Perfil não encontrado')
    }

    if (profile.role !== 'church_admin') {
      throw new Error('Acesso negado: usuário não é administrador da igreja')
    }

    if (!profile.church_id) {
      throw new Error('Acesso negado: usuário não está associado a uma igreja')
    }

    const { data: church, error: churchError } = await adminSupabase
      .from('churches')
      .select('*')
      .eq('id', profile.church_id)
      .maybeSingle()

    if (churchError || !church) {
      throw new Error('Igreja não encontrada')
    }

    const status = this.normalizeChurchFlag(church.status)
    const planType = this.normalizeChurchFlag(church.plan_type)
    const planStatus = this.normalizeChurchFlag(church.plan_status)
    if (status !== 'active' || planType !== 'business' || planStatus !== 'active') {
      throw new Error(this.businessOnlyActionMessage)
    }

    return { profile, church }
  }

  /**
   * Verifica se a igreja tem plano Business ativo
   */
  async assertBusinessChurchActive(churchId: string): Promise<Church> {
    const adminSupabase = await this.getAdminSupabase()
    const { data: church, error } = await adminSupabase
      .from('churches')
      .select('*')
      .eq('id', churchId)
      .maybeSingle()

    if (error || !church) {
      throw new Error('Igreja não encontrada')
    }

    const status = this.normalizeChurchFlag(church.status)
    const planType = this.normalizeChurchFlag(church.plan_type)
    const planStatus = this.normalizeChurchFlag(church.plan_status)

    if (status !== 'active') {
      throw new Error('Igreja não está ativa')
    }

    if (planType !== 'business' || planStatus !== 'active') {
      throw new Error('Igreja não possui plano Business ativo')
    }

    return church
  }

  private normalizeInvitationRole(value: unknown): ChurchInvitationRole | null {
    if (value === 'leader' || value === 'church_admin') return value
    return null
  }

  private normalizeInvitationStatus(value: unknown): ChurchInvitationStatus | null {
    if (value === 'pending' || value === 'accepted' || value === 'cancelled' || value === 'expired') return value
    return null
  }

  private normalizeEmail(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!raw) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(raw)) return null
    return raw
  }

  private normalizeOptionalText(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim() : ''
    return raw ? raw : null
  }

  private normalizeMinistryTitle(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (!raw) return null

    const normalized = raw
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll(/[^a-z]/g, '')

    if (
      normalized === 'pastor' ||
      normalized === 'diacono' ||
      normalized === 'bispo' ||
      normalized === 'apostolo' ||
      normalized === 'missionario' ||
      normalized === 'pregador' ||
      normalized === 'lider'
    ) {
      return normalized
    }

    return null
  }

  private normalizeExpiresAt(value: unknown): string | null {
    if (value === null || value === undefined) return null
    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) return null
      return value.toISOString()
    }
    if (typeof value === 'string') {
      const d = new Date(value)
      if (!Number.isFinite(d.getTime())) return null
      return d.toISOString()
    }
    return null
  }

  private isExpired(expiresAtIso: string | null): boolean {
    if (!expiresAtIso) return false
    const d = new Date(expiresAtIso)
    if (!Number.isFinite(d.getTime())) return false
    return d.getTime() <= Date.now()
  }

  private mapInvitationRow(row: Record<string, unknown>): ChurchInvitation {
    const role = this.normalizeInvitationRole(row['role']) ?? 'leader'
    const status = this.normalizeInvitationStatus(row['status']) ?? 'pending'
    const email = String(row['email'] ?? '').trim().toLowerCase()
    return {
      id: String(row['id']),
      church_id: String(row['church_id']),
      invited_by: String(row['invited_by']),
      email,
      name: typeof row['name'] === 'string' ? String(row['name']) : row['name'] === null || row['name'] === undefined ? null : String(row['name']),
      ministry_title:
        typeof row['ministry_title'] === 'string'
          ? String(row['ministry_title'])
          : row['ministry_title'] === null || row['ministry_title'] === undefined
            ? null
            : String(row['ministry_title']),
      role,
      status,
      token: String(row['token']),
      expires_at: row['expires_at'] ? String(row['expires_at']) : null,
      accepted_at: row['accepted_at'] ? String(row['accepted_at']) : null,
      created_at: String(row['created_at']),
      updated_at: String(row['updated_at']),
    }
  }

  async createInvitation(input: {
    email: string
    name?: string
    ministryTitle?: string
    role?: ChurchInvitationRole
    expiresAt?: string | Date | null
  }): Promise<ChurchInvitation> {
    const { profile, church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const email = this.normalizeEmail(input.email)
    if (!email) throw new Error('E-mail inválido')

    const role = this.normalizeInvitationRole(input.role) ?? 'leader'
    const name = this.normalizeOptionalText(input.name)
    const ministryTitle = this.normalizeOptionalText(input.ministryTitle)

    const expiresAt =
      input.expiresAt === undefined ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : this.normalizeExpiresAt(input.expiresAt)

    if (this.isExpired(expiresAt)) throw new Error('Data de expiração inválida')

    for (let attempt = 0; attempt < 3; attempt++) {
      const token = crypto.randomBytes(32).toString('base64url')
      const { data, error } = await supabase
        .from('church_invitations')
        .insert({
          church_id: church.id,
          invited_by: profile.auth_user_id,
          email,
          name,
          ministry_title: ministryTitle,
          role,
          status: 'pending',
          token,
          expires_at: expiresAt,
        })
        .select('*')
        .single()

      if (!error && data) return this.mapInvitationRow(data as Record<string, unknown>)

      const err = error && typeof error === 'object' ? (error as unknown as Record<string, unknown>) : null
      const code = err && typeof err['code'] === 'string' ? err['code'] : ''
      const msg = err && typeof err['message'] === 'string' ? err['message'] : ''
      const isTokenCollision = code === '23505' && msg.toLowerCase().includes('token')
      if (!isTokenCollision) throw new Error(msg || 'Erro ao criar convite')
    }

    throw new Error('Erro ao gerar token de convite')
  }

  async getInvitationByToken(token: string): Promise<ChurchInvitation | null> {
    const rawToken = typeof token === 'string' ? token.trim() : ''
    if (!rawToken) return null

    const service = await this.getAdminSupabase()
    const { data, error } = await service
      .from('church_invitations')
      .select('id,church_id,invited_by,email,name,ministry_title,role,status,token,expires_at,accepted_at,created_at,updated_at')
      .eq('token', rawToken)
      .maybeSingle()

    if (error) throw new Error('Erro ao buscar convite')
    if (!data?.id) return null

    const invitation = this.mapInvitationRow(data as Record<string, unknown>)
    if (invitation.status !== 'pending') return null
    if (this.isExpired(invitation.expires_at)) return null

    const { data: church, error: churchError } = await service
      .from('churches')
      .select('id,status,plan_type,plan_status')
      .eq('id', invitation.church_id)
      .maybeSingle()

    if (churchError || !church?.id) return null
    if (church.status !== 'active') return null
    if (church.plan_type !== 'business' || church.plan_status !== 'active') return null

    return invitation
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const { church } = await this.assertChurchAdmin()
    const supabase = await this.getSupabase()

    const id = typeof invitationId === 'string' ? invitationId.trim() : ''
    if (!id) throw new Error('Convite inválido')

    const { data, error } = await supabase
      .from('church_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('church_id', church.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (error) throw new Error('Erro ao cancelar convite')
    if (!data?.id) throw new Error('Convite não encontrado')
  }

  /**
   * Obtém a igreja do usuário logado
   */
  async getCurrentUserChurch(): Promise<{ profile: Profile; church: Church }> {
    const supabase = await this.getSupabase()
    const adminSupabase = await this.getAdminSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError || !profile || !profile.church_id) {
      throw new Error('Usuário não está associado a uma igreja')
    }

    const { data: church, error: churchError } = await adminSupabase
      .from('churches')
      .select('*')
      .eq('id', profile.church_id)
      .maybeSingle()

    if (churchError || !church) {
      throw new Error('Igreja não encontrada')
    }

    return { profile, church }
  }

  async getChurchMembers(): Promise<Profile[]> {
    const { church } = await this.assertChurchAdmin()
    const adminSupabase = await this.getAdminSupabase()

    const { data: members, error } = await adminSupabase
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
    const adminSupabase = await this.getAdminSupabase()

    const { data: admins, error } = await adminSupabase
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
    const adminSupabase = await this.getAdminSupabase()

    const { data: preachers, error } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('church_id', church.id)
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
    role?: 'leader' | 'church_admin'
  }): Promise<Profile> {
    const { church } = await this.assertChurchAdmin()
    const adminSupabase = await this.getAdminSupabase()

    // Validar e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw new Error('E-mail inválido')
    }

    const desiredRole = data.role === 'church_admin' ? 'church_admin' : 'leader'
    const normalizedMinistryTitle = this.normalizeMinistryTitle(data.ministryTitle)

    const { data: existingProfile, error: existingProfileError } = await adminSupabase
      .from('profiles')
      .select('id,auth_user_id,role,email,church_id')
      .ilike('email', data.email.trim())
      .maybeSingle()

    if (existingProfileError) {
      throw new Error('Erro ao verificar usuário existente')
    }

    if (existingProfile?.id) {
      const currentRole = typeof existingProfile.role === 'string' ? existingProfile.role : ''
      if (currentRole === 'admin') {
        throw new Error(this.churchAdminOptionMessage)
      }

      const existingChurchId = typeof existingProfile.church_id === 'string' ? existingProfile.church_id : null
      if (existingChurchId && existingChurchId !== church.id) {
        throw new Error('Acesso negado: só é possível gerenciar usuários da própria igreja')
      }

      const patch: Record<string, unknown> = {
        church_id: church.id,
        role: desiredRole,
        status: 'active',
        church_membership_source: 'invitation',
        church_membership_confirmed_at: new Date().toISOString(),
      }
      if (normalizedMinistryTitle) patch.ministry_title = normalizedMinistryTitle
      if (data.name?.trim()) {
        patch.display_name = data.name.trim()
        patch.name = data.name.trim()
      }

      const { data: updated, error: updateError } = await adminSupabase
        .from('profiles')
        .update(patch)
        .eq('id', String(existingProfile.id))
        .select('*')
        .single()

      if (updateError || !updated) {
        throw new Error('Erro ao atualizar perfil')
      }

      return updated as Profile
    }

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.name,
        ministry_title: normalizedMinistryTitle,
      },
    })

    if (authError || !authUser.user) {
      throw new Error('Erro ao criar usuário: ' + authError?.message)
    }

    const siteUrl = buildSiteUrl()
    if (!siteUrl) {
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error('Não foi possível enviar o e-mail. URL do site não está configurada.')
    }

    const supabase = await this.getSupabase()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email.trim(), {
      redirectTo: `${siteUrl}/auth/reset-password`,
    })

    if (resetError) {
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(
        'Não foi possível enviar o e-mail para o convidado. Verifique a configuração de e-mail/URL no Supabase.',
      )
    }

    const { data: newProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert(
        {
          auth_user_id: authUser.user.id,
          name: data.name,
          display_name: data.name,
          email: data.email.trim().toLowerCase(),
          ministry_title: normalizedMinistryTitle,
          role: desiredRole,
          church_id: church.id,
          church_membership_source: 'invitation',
          church_membership_confirmed_at: new Date().toISOString(),
          status: 'active',
        },
        { onConflict: 'auth_user_id' },
      )
      .select()
      .single()

    if (profileError || !newProfile) {
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error('Erro ao criar perfil: ' + profileError?.message)
    }

    return newProfile as Profile
  }

  /**
   * Desativa um preleitor da igreja
   */
  async deactivateChurchPreacher(preacherId: string): Promise<void> {
    const { church } = await this.assertChurchAdmin()
    const adminSupabase = await this.getAdminSupabase()

    const { error } = await adminSupabase
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
    const adminSupabase = await this.getAdminSupabase()

    const { error } = await adminSupabase
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
    const adminSupabase = await this.getAdminSupabase()
    const currentProfile = await this.getCurrentProfile()
    const targetProfile = await adminSupabase
      .from('profiles')
      .select('id,auth_user_id,role,church_id,status')
      .eq('id', profileId)
      .maybeSingle()

    if (targetProfile.error || !targetProfile.data?.id) {
      throw new Error('Usuário não encontrado')
    }

    const target = targetProfile.data as unknown as Profile

    if (!target.church_id) {
      throw new Error(this.churchAdminOptionMessage)
    }

    if (target.role === 'admin') {
      throw new Error(this.churchAdminOptionMessage)
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', target.church_id)
      .single()

    if (churchError || !church) {
      throw new Error(this.churchAdminOptionMessage)
    }

    if (church.status !== 'active' || church.plan_type !== 'business' || church.plan_status !== 'active') {
      throw new Error(this.churchAdminOptionMessage)
    }

    if (currentProfile.role === 'leader') {
      throw new Error('Acesso negado: usuário não tem permissão para promover')
    }

    if (currentProfile.role === 'church_admin' && currentProfile.church_id !== target.church_id) {
      throw new Error('Acesso negado: só é possível promover usuários da própria igreja')
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from('profiles')
      .update({ role: 'church_admin' })
      .eq('id', profileId)
      .eq('church_id', target.church_id)
      .select('id')
      .maybeSingle()

    if (updateError || !updated?.id) {
      throw new Error('Não foi possível promover o usuário.')
    }
  }

  /**
   * Remove papel de church_admin (apenas Admin Global)
   */
  async demoteUserFromChurchAdmin(profileId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const adminSupabase = await this.getAdminSupabase()
    const currentProfile = await this.getCurrentProfile()
    const targetProfile = await adminSupabase
      .from('profiles')
      .select('id,auth_user_id,role,church_id,status')
      .eq('id', profileId)
      .maybeSingle()

    if (targetProfile.error || !targetProfile.data?.id) {
      throw new Error('Usuário não encontrado')
    }

    const target = targetProfile.data as unknown as Profile

    if (target.role !== 'church_admin') {
      throw new Error('Usuário não é administrador da igreja')
    }

    if (!target.church_id) {
      throw new Error('Usuário não pertence a uma igreja')
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', target.church_id)
      .single()

    if (churchError || !church) {
      throw new Error(this.businessOnlyActionMessage)
    }

    if (church.status !== 'active' || church.plan_type !== 'business' || church.plan_status !== 'active') {
      throw new Error(this.businessOnlyActionMessage)
    }

    if (currentProfile.role === 'leader') {
      throw new Error('Acesso negado: usuário não tem permissão para remover administrador')
    }

    if (currentProfile.role === 'church_admin' && currentProfile.church_id !== target.church_id) {
      throw new Error('Acesso negado: só é possível remover administradores da própria igreja')
    }

    const { data: activeAdmins, error: activeAdminsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('church_id', target.church_id)
      .eq('role', 'church_admin')
      .eq('status', 'active')

    if (activeAdminsError) {
      throw new Error('Erro ao verificar administradores da igreja')
    }

    if ((activeAdmins?.length ?? 0) <= 1) {
      throw new Error('Esta igreja precisa ter pelo menos um administrador ativo.')
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from('profiles')
      .update({ role: 'leader' })
      .eq('id', profileId)
      .eq('role', 'church_admin')
      .select('id')
      .maybeSingle()

    if (updateError || !updated?.id) {
      throw new Error('Não foi possível remover o papel de administrador.')
    }
  }
}
