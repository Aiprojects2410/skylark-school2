import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const STAFF = ['super_admin', 'admin', 'principal']
const MANAGED = ['teacher', 'student']

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

async function caller(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: p } = await admin.from('profiles').select('id,role').eq('id', user.id).single()
  return p
}

async function audit(actorId: string, action: string, targetId?: string, targetType?: string, metadata = {}) {
  await admin.from('erp_audit_logs').insert({ actor_id: actorId, action, target_id: targetId || null, target_type: targetType || null, metadata })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const profile = await caller(req)
    if (profile?.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Super Admin only' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })
    const body = await req.json()
    const action = body.action

    if (action === 'create') {
      const role = body.role
      if (!MANAGED.includes(role)) throw new Error('Developer Portal can create only Teacher or Student accounts')
      const password = String(body.password || '')
      if (password.length < 8) throw new Error('Password must be at least 8 characters')
      const email = String(body.email || '').trim().toLowerCase() || `${String(body.login_code || '').toLowerCase()}@portal.skylark.local`
      if (email.endsWith('@portal.skylark.local')) {
        // Auth requires a syntactically valid email; this placeholder is never exposed as a credential.
      }
      const { data: u, error: ue } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: body.full_name, role } })
      if (ue) throw ue
      const uid = u.user.id
      const { error: pe } = await admin.from('profiles').upsert({ id: uid, full_name: body.full_name, email, phone: body.phone || null, role, login_code: body.login_code || null }, { onConflict: 'id' })
      if (pe) { await admin.auth.admin.deleteUser(uid); throw pe }
      if (role === 'teacher') {
        const { data: teacher, error } = await admin.from('teachers').insert({ full_name: body.full_name, email, phone: body.phone || null, profile_id: uid }).select('id,employee_id').single()
        if (error) { await admin.auth.admin.deleteUser(uid); throw error }
        await audit(profile.id, 'developer_create_teacher', teacher.id, 'teacher', { login_code: teacher.employee_id })
        return new Response(JSON.stringify({ username: teacher.employee_id, email, message: 'Teacher account created.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
      const studentPayload = { full_name: body.full_name, email, auth_user_id: uid, status: 'active', class_id: body.class_id || null, section_id: body.section_id || null }
      const { data: student, error } = await admin.from('students').insert(studentPayload).select('id,student_id').single()
      if (error) { await admin.auth.admin.deleteUser(uid); throw error }
      await audit(profile.id, 'developer_create_student', student.id, 'student', { login_code: student.student_id })
      return new Response(JSON.stringify({ username: student.student_id, email, message: 'Student account created.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const userId = body.user_id
    if (!userId) throw new Error('user_id is required')
    const { data: target } = await admin.from('profiles').select('id,role').eq('id', userId).single()
    if (!target) throw new Error('Account not found')
    if (target.role === 'super_admin') throw new Error('Super Admin accounts are protected')

    if (action === 'reset_password') {
      const temporary = `Sky@${Math.floor(100000 + Math.random() * 900000)}`
      const { error } = await admin.auth.admin.updateUserById(userId, { password: temporary, user_metadata: { must_change_password: true } })
      if (error) throw error
      await audit(profile.id, 'reset_password', userId, target.role)
      return new Response(JSON.stringify({ username: userId, temp_password: temporary }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (action === 'revoke_sessions' || action === 'delete_session') {
      const { error } = await admin.auth.admin.signOut(userId, 'others')
      if (error) throw error
      await admin.from('erp_security_events').insert({ user_id: userId, event_type: action === 'delete_session' ? 'session_deleted' : 'sessions_revoked', metadata: { actor_id: profile.id } })
      await audit(profile.id, action, userId, target.role)
      return new Response(JSON.stringify({ message: action === 'delete_session' ? 'Other sessions removed.' : 'Other sessions revoked.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (action === 'revoke') {
      await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
      await audit(profile.id, 'account_revoked', userId, target.role)
      return new Response(JSON.stringify({ message: 'Account revoked.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (action === 'restore') {
      await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      await audit(profile.id, 'account_restored', userId, target.role)
      return new Response(JSON.stringify({ message: 'Account restored.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (action === 'delete_user') {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
      await audit(profile.id, 'account_deleted', userId, target.role)
      return new Response(JSON.stringify({ message: 'Account deleted.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    throw new Error('Unsupported action')
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
