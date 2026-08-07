import { supabase } from '../lib/supabase'

export async function getClasses() {
  if (!supabase) return []
  const { data, error } = await supabase.from('classes').select('*, sections(*), teachers:class_teacher_id(full_name)').order('name')
  if (error) throw error
  return (data || []).map(c => ({ ...c, teacher: c.teachers?.full_name || '', students: c.sections?.reduce((n, s) => n + Number(s.student_count || 0), 0) || undefined }))
}

export async function getClassesWithCounts() {
  if (!supabase) return []
  const { data, error } = await supabase.from('classes').select('*, sections(id,name,students(id))').order('name')
  if (error) throw error
  return (data || []).map(c => ({ ...c, sections: (c.sections || []).map(s => ({ ...s, studentCount: s.students?.length || 0 })) }))
}
