import { supabase } from '../lib/supabase'

export async function getTeacherAttendanceForDate(date) {
  if (!supabase) return []
  const { data: teachers, error: te } = await supabase.from('teachers').select('id,employee_id,profile_id,profiles(full_name)').order('employee_id')
  if (te) throw te
  const ids = (teachers || []).map(t => t.id)
  const { data: rows, error } = ids.length ? await supabase.from('teacher_attendance').select('*').in('teacher_id', ids).eq('attendance_date', date) : { data: [], error: null }
  if (error) throw error
  const byId = Object.fromEntries((rows || []).map(r => [r.teacher_id, r]))
  return (teachers || []).map(t => ({ ...t, full_name: t.profiles?.full_name || '', status: byId[t.id]?.status || null, marked_at: byId[t.id]?.marked_at || null }))
}

export async function markTeacherAttendance(teacherId, status, date) {
  if (!supabase) return
  const { error } = await supabase.from('teacher_attendance').upsert({ teacher_id: teacherId, status, attendance_date: date, marked_at: new Date().toISOString() }, { onConflict: 'teacher_id,attendance_date' })
  if (error) throw error
}
