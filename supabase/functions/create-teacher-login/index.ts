// supabase/functions/create-teacher-login/index.ts
// Mirrors create-student-login: creates (or resets) a Supabase Auth account for a teacher,
// using the service role key server-side only. Only staff may call this.

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
      return new Response(JSON.stringify({ error: 'Only staff can create teacher logins' }), { status: 403, headers: cors })
    }

    const { teacher_id } = await req.json()
    const { data: teacher, error: teacherError } = await admin.from('teachers').select('id, employee_id, full_name, email, profile_id').eq('id', teacher_id).single()
    if (teacherError || !teacher) return new Response(JSON.stringify({ error: 'Teacher not found' }), { status: 404, headers: cors })

    const tempPassword = randomPassword()
    const loginEmail = teacher.email || `${teacher.employee_id.toLowerCase()}@staff.skylarkschool.edu`

    // Idempotent, same reasoning as create-student-login: reuse an existing profile if one
    // already matches this school_id/email, instead of retrying createUser() and hitting the
    // unique constraint on profiles.school_id.
    let profileId = teacher.profile_id
    if (!profileId) {
      const { data: existingProfile } = await admin.from('profiles').select('id').or(`login_code.eq.${teacher.employee_id},email.eq.${loginEmail}`).maybeSingle()
      if (existingProfile) profileId = existingProfile.id
    }

    if (profileId) {
      const { error } = await admin.auth.admin.updateUserById(profileId, { password: tempPassword, email_confirm: true, user_metadata: { must_change_password: true } })
      if (error) throw error
      await admin.from('profiles').update({ role: 'teacher', login_code: teacher.employee_id, email: loginEmail, full_name: teacher.full_name }).eq('id', profileId)
      await admin.from('teachers').update({ profile_id: profileId }).eq('id', teacher.id)
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: loginEmail, password: tempPassword, email_confirm: true,
        user_metadata: { full_name: teacher.full_name, role: 'teacher', login_code: teacher.employee_id, must_change_password: true },
      })
      if (error) throw error
      profileId = created.user.id
      await admin.from('profiles').update({ role: 'teacher', login_code: teacher.employee_id, email: loginEmail, full_name: teacher.full_name }).eq('id', profileId)
      await admin.from('teachers').update({ profile_id: profileId }).eq('id', teacher.id)
    }

    return new Response(JSON.stringify({
      username: teacher.employee_id, email: loginEmail, temp_password: tempPassword,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: cors })
  }
})
