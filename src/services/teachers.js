import { supabase } from '../lib/supabase'

export async function getTeachers() {
  if (!supabase) return []
  const { data, error } = await supabase.from('teachers').select('*, profiles(full_name)').order('employee_id')
  if (error) throw error
  return (data || []).map(t => ({ ...t, full_name: t.full_name || t.profiles?.full_name || '' }))
}

export async function setTeacherCardPrinted(id, printed) {
  if (!supabase) return
  const { error } = await supabase.from('teachers').update({ card_printed_at: printed ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw error
}
