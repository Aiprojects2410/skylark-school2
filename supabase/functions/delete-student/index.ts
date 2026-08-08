import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: cors })
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).single()
    if (!['super_admin', 'admin'].includes(callerProfile?.role)) return new Response(JSON.stringify({ error: 'Only Admin and Super Admin can delete students' }), { status: 403, headers: cors })

    const { student_id } = await req.json()
    const { data: student, error: studentError } = await admin.from('students').select('id, auth_user_id').eq('id', student_id).single()
    if (studentError || !student) return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404, headers: cors })

    const authUserId = student.auth_user_id
    const { error: deleteError } = await admin.from('students').delete().eq('id', student.id)
    if (deleteError) throw deleteError
    if (authUserId) {
      await admin.from('profiles').delete().eq('id', authUserId)
      const { error: authError } = await admin.auth.admin.deleteUser(authUserId)
      if (authError && authError.status !== 404) throw authError
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: cors })
  }
})
