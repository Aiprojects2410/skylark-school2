// supabase/functions/create-student-login/index.ts
// Creates (or resets) a Supabase Auth account for a student, using the service role key —
// which never touches the browser. Only staff (checked via the caller's own JWT) may call this.
// Returns the plain-text temporary password ONCE; it is never stored anywhere.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function randomPassword() {
  const words = ['Sky', 'Blue', 'Star', 'Moon', 'Sun', 'Leaf', 'Wave', 'Fox']
  const word = words[Math.floor(Math.random() * words.length)]
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `${word}@${digits}`
}

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: cors })

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).single()
    if (!['super_admin', 'admin', 'principal'].includes(callerProfile?.role)) {
      return new Response(JSON.stringify({ error: 'Only staff can create student logins' }), { status: 403, headers: cors })
    }

    const { student_id } = await req.json()
    const { data: student, error: studentError } = await admin.from('students').select('id, student_id, full_name, auth_user_id').eq('id', student_id).single()
    if (studentError || !student) return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404, headers: cors })

    const tempPassword = randomPassword()
    const loginEmail = `${student.student_id.toLowerCase()}@students.skylarkschool.edu`

    // Idempotent: if a profile already exists for this school_id/email (e.g. from a previous
    // attempt that partially failed), reuse it instead of calling createUser() again — that
    // would hit the unique constraint on profiles.school_id and fail with a generic
    // "Database error creating new user".
    let authUserId = student.auth_user_id
    if (!authUserId) {
      const { data: existingProfile } = await admin.from('profiles').select('id').or(`login_code.eq.${student.student_id},email.eq.${loginEmail}`).maybeSingle()
      if (existingProfile) authUserId = existingProfile.id
    }

    if (authUserId) {
      const { error } = await admin.auth.admin.updateUserById(authUserId, { password: tempPassword, email_confirm: true, user_metadata: { must_change_password: true } })
      if (error) throw error
      await admin.from('profiles').update({ role: 'student', login_code: student.student_id, email: loginEmail }).eq('id', authUserId)
      await admin.from('students').update({ auth_user_id: authUserId }).eq('id', student.id)
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: loginEmail, password: tempPassword, email_confirm: true,
        user_metadata: { full_name: student.full_name, role: 'student', login_code: student.student_id, must_change_password: true },
      })
      if (error) throw error
      authUserId = created.user.id
      await admin.from('profiles').update({ role: 'student', login_code: student.student_id, email: loginEmail }).eq('id', authUserId)
      await admin.from('students').update({ auth_user_id: authUserId }).eq('id', student.id)
    }

    return new Response(JSON.stringify({
      username: student.student_id, email: loginEmail, temp_password: tempPassword,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: cors })
  }
})
