import { supabase } from '../lib/supabase'

export async function getNotices() {
  if (!supabase) return []
  const { data, error } = await supabase.from('notices').select('*').order('published_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createNotice(payload) {
  if (!supabase) return { ...payload, id: crypto.randomUUID(), published_at: new Date().toISOString() }
  const { data: { user } = {} } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('notices').insert({ ...payload, created_by: user?.id }).select().single()
  if (error) throw error
  return data
}
