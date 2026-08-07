// supabase/functions/reset-user-password/index.ts
// Lets staff (super_admin, admin, principal) reset the password for ANY account —
// including other admins/principals, not just students and teachers. Looks the target
// up by School ID (login_code) or email, sets a fresh temporary password, and flags the
// account so the holder is forced to set their own password on next login.
// Uses the service role key server-side only; it never touches the browser.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const STAFF_ROLES = ['super_admin', 'admin', 'principal']

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
    if (!STAFF_ROLES.includes(callerProfile?.role)) {
      return new Response(JSON.stringify({ error: 'Only admin, principal or super admin can reset passwords' }), { status: 403, headers: cors })
    }

    const { identifier } = await req.json()
    if (!identifier || !String(identifier).trim()) {
      return new Response(JSON.stringify({ error: 'Provide a School ID or email to look up' }), { status: 400, headers: cors })
    }

    const term = String(identifier).trim()
    const { data: target, error: findError } = await admin.from('profiles')
      .select('id, full_name, role, login_code, email')
      .or(`login_code.eq.${term},email.eq.${term}`)
      .maybeSingle()
    if (findError) throw findError
    if (!target) return new Response(JSON.stringify({ error: 'No account found with that School ID or email' }), { status: 404, headers: cors })

    const tempPassword = randomPassword()
    const { error: updateError } = await admin.auth.admin.updateUserById(target.id, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    })
    if (updateError) throw updateError

    return new Response(JSON.stringify({
      full_name: target.full_name, role: target.role, username: target.login_code, email: target.email, temp_password: tempPassword,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: cors })
  }
})
