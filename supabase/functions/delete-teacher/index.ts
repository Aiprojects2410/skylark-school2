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
    if (!['super_admin', 'admin'].includes(callerProfile?.role)) return new Response(JSON.stringify({ error: 'Only Admin and Super Admin can delete teachers' }), { status: 403, headers: cors })

    const { teacher_id } = await req.json()
    const { data: teacher, error: teacherError } = await admin.from('teachers').select('id, profile_id').eq('id', teacher_id).single()
    if (teacherError || !teacher) return new Response(JSON.stringify({ error: 'Teacher not found' }), { status: 404, headers: cors })

    const profileId = teacher.profile_id
    const { error: deleteError } = await admin.from('teachers').delete().eq('id', teacher.id)
    if (deleteError) throw deleteError
    if (profileId) {
      await admin.from('profiles').delete().eq('id', profileId)
      const { error: authError } = await admin.auth.admin.deleteUser(profileId)
      if (authError && authError.status !== 404) throw authError
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: cors })
  }
})
