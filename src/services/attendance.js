import { supabase } from '../lib/supabase'

export const todayISO = () => new Date().toISOString().slice(0, 10)

export async function getSchoolAttendanceOverview(date = todayISO()) {
  if (!supabase) return { overallPercent: 0, classes: [] }
  const { data, error } = await supabase.from('attendance').select('status, students(class_id, classes(name))').eq('attendance_date', date)
  if (error) throw error
  const rows = data || []
  const present = rows.filter(r => ['present', 'late', 'half_day'].includes(r.status)).length
  const classes = Object.values(rows.reduce((m, r) => {
    const name = r.students?.classes?.name || 'Unassigned'
    m[name] ||= { name, total: 0, present: 0, percent: 0 }
    m[name].total += 1
    if (['present', 'late', 'half_day'].includes(r.status)) m[name].present += 1
    m[name].percent = Math.round((m[name].present / m[name].total) * 100)
    return m
  }, {}))
  return { overallPercent: rows.length ? Math.round((present / rows.length) * 100) : 0, classes }
}

export async function getClassesWithCounts() {
  if (!supabase) return []
  const { data, error } = await supabase.from('classes').select('*, sections(id,name,students(id))').order('name')
  if (error) throw error
  return (data || []).map(c => ({ ...c, sections: (c.sections || []).map(s => ({ ...s, studentCount: s.students?.length || 0 })) }))
}

export async function getSectionAttendance(sectionId, date = todayISO()) {
  if (!supabase) return { students: [], summary: { total: 0, present: 0, absent: 0, late: 0, half_day: 0, percent: 0 } }
  const { data: students, error: se } = await supabase.from('students').select('id,student_id,full_name').eq('section_id', sectionId).order('full_name')
  if (se) throw se
  const ids = (students || []).map(s => s.id)
  const { data: attendance, error: ae } = ids.length ? await supabase.from('attendance').select('*').in('student_id', ids).eq('attendance_date', date) : { data: [], error: null }
  if (ae) throw ae
  const byId = Object.fromEntries((attendance || []).map(a => [a.student_id, a]))
  const list = (students || []).map(s => ({ ...s, ...(byId[s.id] || {}), status: byId[s.id]?.status || null }))
  const summary = { total: list.length, present: list.filter(s => s.status === 'present').length, absent: list.filter(s => s.status === 'absent').length, late: list.filter(s => s.status === 'late').length, half_day: list.filter(s => s.status === 'half_day').length, percent: 0 }
  summary.percent = summary.total ? Math.round(((summary.present + summary.late + summary.half_day) / summary.total) * 100) : 0
  return { students: list, summary }
}

export async function markAttendance(records, date = todayISO()) {
  if (!supabase || !records.length) return
  const { data: { user } = {} } = await supabase.auth.getUser()
  const payload = records.map(r => ({ student_id: r.student_id, status: r.status, attendance_date: date, marked_by: user?.id }))
  const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'student_id,attendance_date' })
  if (error) throw error
}

export function subscribeToAttendance(date, callback) {
  if (!supabase) return () => {}
  const channel = supabase.channel(`attendance-${date}`).on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `attendance_date=eq.${date}` }, callback).subscribe()
  return () => supabase.removeChannel(channel)
}
