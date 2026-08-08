import { supabase } from '../lib/supabase'

export async function getStudents() {
  if (!supabase) return []
  const { data, error } = await supabase.from('students').select('*, classes(name), sections(name)').order('full_name')
  if (error) throw error
  return (data || []).map(s => ({ ...s, class_name: s.classes?.name || '', section_name: s.sections?.name || '' }))
}

export async function saveStudent(student) {
  if (!supabase) return student
  const payload = { ...student }
  delete payload.id; delete payload.class_name; delete payload.section_name; delete payload.classes; delete payload.sections
  const query = student.id
    ? supabase.from('students').update(payload).eq('id', student.id).select('*, classes(name), sections(name)').single()
    : supabase.from('students').insert(payload).select('*, classes(name), sections(name)').single()
  const { data, error } = await query
  if (error) throw error
  return { ...data, class_name: data.classes?.name || '', section_name: data.sections?.name || '' }
}

export async function deleteStudent(id) {
  if (!supabase) return
  const { data, error } = await supabase.functions.invoke('delete-student', { body: { student_id: id } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function setStudentCardPrinted(id, printed) {
  if (!supabase) return
  const { error } = await supabase.from('students').update({ card_printed_at: printed ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw error
}

export async function createStudentLogin(studentId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('create-student-login', { body: { student_id: studentId } })
  if (error) throw error
  return data
}
