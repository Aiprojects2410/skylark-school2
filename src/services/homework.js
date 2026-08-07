import { supabase } from '../lib/supabase'

export async function getHomework() {
  if (!supabase) return []
  const { data, error } = await supabase.from('homework').select('*, classes(name), sections(name)').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(h => ({ ...h, class_name: h.classes?.name || '', section_name: h.sections?.name || '' }))
}

export async function createHomework(payload) {
  if (!supabase) return { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  const { data: { user } = {} } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('homework').insert({ ...payload, created_by: user?.id }).select('*, classes(name), sections(name)').single()
  if (error) throw error
  return { ...data, class_name: data.classes?.name || '', section_name: data.sections?.name || '' }
}
