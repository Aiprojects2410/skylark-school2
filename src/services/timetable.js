import { supabase } from '../lib/supabase'

export async function getTimetableSlots() {
  if (!supabase) return []
  const { data, error } = await supabase.from('timetable_slots').select('*, teachers(full_name,employee_id), classes(name), sections(name)').order('day_of_week').order('start_time')
  if (error) throw error
  return (data || []).map(s => ({ ...s, teacher_name: s.teachers?.full_name || '', class_name: s.classes?.name || '', section_name: s.sections?.name || '' }))
}

export async function saveTimetableSlot(slot) {
  if (!supabase) return slot
  const payload = { ...slot }
  delete payload.id; delete payload.teacher_name; delete payload.class_name; delete payload.section_name; delete payload.teachers; delete payload.classes; delete payload.sections
  const query = slot.id ? supabase.from('timetable_slots').update(payload).eq('id', slot.id).select('*, teachers(full_name,employee_id), classes(name), sections(name)').single() : supabase.from('timetable_slots').insert(payload).select('*, teachers(full_name,employee_id), classes(name), sections(name)').single()
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function deleteTimetableSlot(id) {
  if (!supabase) return
  const { error } = await supabase.from('timetable_slots').delete().eq('id', id)
  if (error) throw error
}
