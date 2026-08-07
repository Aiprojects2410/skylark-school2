import { supabase } from '../lib/supabase'

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function getTeacherPortalSummary(profileId) {
  if (!supabase || !profileId) return null
  const { data: teacher, error: te } = await supabase.from('teachers').select('id,employee_id,profiles(full_name)').eq('profile_id', profileId).maybeSingle()
  if (te) throw te
  if (!teacher) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const [attRes, slotsRes, leaveRes] = await Promise.all([
    supabase.from('teacher_attendance').select('status,attendance_date').eq('teacher_id', teacher.id).gte('attendance_date', start).lte('attendance_date', end),
    supabase.from('timetable_slots').select('id,subject,day_of_week,start_time,end_time,classes(name),sections(name)').eq('teacher_id', teacher.id),
    supabase.from('leave_requests').select('status,start_date,end_date').eq('applicant_id', profileId),
  ])
  if (attRes.error) throw attRes.error
  if (slotsRes.error) throw slotsRes.error
  if (leaveRes.error) throw leaveRes.error
  const attendance = attRes.data || []
  const leaves = leaveRes.data || []
  const day = now.getDay()
  const todaysClasses = (slotsRes.data || []).filter(s => Number(s.day_of_week) === day).map(s => ({ ...s, class_name: s.classes?.name || '', section_name: s.sections?.name || '' }))
  const workingDays = new Set(attendance.map(a => a.attendance_date)).size
  return {
    teacher,
    todaysClasses,
    workingDays,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    halfDay: attendance.filter(a => a.status === 'half_day').length,
    leavesTaken: leaves.filter(l => l.status === 'approved').length,
    pendingLeaves: leaves.filter(l => l.status === 'pending').length,
    leaveBalance: Math.max(0, 12 - leaves.filter(l => l.status === 'approved').length),
  }
}
