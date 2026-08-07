import { supabase } from '../lib/supabase'

export async function getStudentPortalSummary(profileId) {
  if (!supabase || !profileId) return null
  let { data: student, error } = await supabase.from('students').select('*, classes(name), sections(name)').eq('auth_user_id', profileId).maybeSingle()
  if (error) throw error
  if (!student) {
    const fallback = await supabase.from('students').select('*, classes(name), sections(name)').eq('parent_id', profileId).maybeSingle()
    if (fallback.error) throw fallback.error
    student = fallback.data
  }
  if (!student) return null
  const { data: attendance, error: ae } = await supabase.from('attendance').select('status,attendance_date').eq('student_id', student.id)
  if (ae) throw ae
  const rows = attendance || []
  const present = rows.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length
  return {
    student: { ...student, class_name: student.classes?.name || '', section_name: student.sections?.name || '' },
    total: rows.length,
    present,
    percent: rows.length ? Math.round((present / rows.length) * 100) : 0,
  }
}
