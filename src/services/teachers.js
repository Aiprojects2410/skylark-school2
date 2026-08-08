import { supabase } from '../lib/supabase'

export async function getTeachers() {
  if (!supabase) return []
  const { data, error } = await supabase.from('teachers').select('*, profiles(full_name)').order('employee_id')
  if (error) throw error
  return (data || []).map(t => ({ ...t, full_name: t.full_name || t.profiles?.full_name || '' }))
}

export async function saveTeacher(teacher) {
  if (!supabase) return teacher
  const payload = { ...teacher }
  delete payload.id
  delete payload.profiles
  if (!payload.employee_id) delete payload.employee_id
  const query = teacher.id
    ? supabase.from('teachers').update(payload).eq('id', teacher.id).select('*, profiles(full_name)').single()
    : supabase.from('teachers').insert(payload).select('*, profiles(full_name)').single()
  const { data, error } = await query
  if (error) throw error
  return { ...data, full_name: data.full_name || data.profiles?.full_name || '' }
}

export async function deleteTeacher(id) {
  if (!supabase) return
  const { data, error } = await supabase.functions.invoke('delete-teacher', { body: { teacher_id: id } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function createTeacherLogin(teacherId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('create-teacher-login', { body: { teacher_id: teacherId } })
  if (error) throw error
  return data
}

export async function setTeacherCardPrinted(id, printed) {
  if (!supabase) return
  const { error } = await supabase.from('teachers').update({ card_printed_at: printed ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw error
}
