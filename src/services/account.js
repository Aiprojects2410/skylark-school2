import { supabase } from '../lib/supabase'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function updateOwnProfile(profileId, updates) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resetAnyPassword(identifier) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('reset-user-password', {
    body: { identifier },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
