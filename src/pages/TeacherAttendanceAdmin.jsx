import { useEffect, useState } from 'react'
import { QrCode } from 'lucide-react'
import { Avatar, Badge, PageHeader } from '../components/ui'
import { useQrCamera } from '../hooks/useQrCamera'
import { verifyAndMarkAttendance } from '../services/identity'
import { getTeacherAttendanceForDate, markTeacherAttendance } from '../services/teacherAttendanceAdmin'
import { todayISO } from '../services/attendance'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUSES = [['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['half_day', 'Half day']]
const STATUS_TONE = { present: 'bg-emerald-50 text-emerald-700', absent: 'bg-rose-50 text-rose-700', late: 'bg-amber-50 text-amber-700', half_day: 'bg-blue-50 text-brand' }

export default function TeacherAttendanceAdmin() {
  const [date, setDate] = useState(todayISO())
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const { profile, role } = useAuth()
  const notify = useToast()
  // Teachers can view the daily record (who was present, who wasn't) — only admin/principal
  // can scan a card or manually correct a status. Marking always goes through staff, never self.
  const canMark = ['super_admin', 'admin', 'principal'].includes(role)

  function load() { setLoading(true); getTeacherAttendanceForDate(date).then(setTeachers).catch(e => notify(e.message)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [date])

  async function setStatus(teacherId, status) {
    try {
      await markTeacherAttendance(teacherId, status, date)
      setTeachers(v => v.map(t => t.id === teacherId ? { ...t, status, marked_at: new Date().toISOString() } : t))
    } catch (e) { notify(e.message) }
  }

  async function handleScan(token) {
    try {
      const outcome = await verifyAndMarkAttendance(token, profile?.id)
      if (outcome.role !== 'teacher') { notify('That QR code belongs to a student, not a teacher.'); return }
      notify(outcome.result === 'marked_present' ? 'Attendance marked!' : outcome.result === 'already_marked' ? 'Already marked today.' : 'QR not recognized.')
      load()
    } catch (e) { notify(e.message) }
  }

  const { videoRef, cameraOn, error, start, stop } = useQrCamera(handleScan)

  const present = teachers.filter(t => ['present', 'late', 'half_day'].includes(t.status)).length
  const notMarked = teachers.filter(t => !t.status).length

  return (
    <>
      <PageHeader eyebrow="FACULTY" title="Teacher Attendance" subtitle={canMark ? "Scan each teacher's ID card, or correct manually. Teachers can't self-mark." : "Daily record of which teachers were present — view only."}
        action={<input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-auto" />} />

      {canMark && (
        <section className="card mb-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Scan a teacher's card</h2>
            {!cameraOn ? <button onClick={start} className="btn-primary"><QrCode size={16} /> Start camera</button> : <button onClick={stop} className="btn-secondary">Stop</button>}
          </div>
          <div className="mt-4 grid aspect-[3/1] place-items-center overflow-hidden rounded-2xl bg-slate-900">
            <video ref={videoRef} className={`h-full w-full object-cover ${cameraOn ? '' : 'hidden'}`} muted playsInline />
            {!cameraOn && <QrCode className="text-slate-500" size={40} />}
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </section>
      )}

      <section className="card mb-6 flex flex-wrap gap-6 text-sm">
        <p><span className="font-bold text-ink dark:text-white">{teachers.length}</span> teachers</p>
        <p className="text-emerald-600"><span className="font-bold">{present}</span> marked present</p>
        <p className="text-amber-600"><span className="font-bold">{notMarked}</span> not marked yet</p>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Teacher</th><th>Employee ID</th><th>Marked at</th><th>{canMark ? 'Status (manual override)' : 'Status'}</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="p-8 text-center">Loading…</td></tr> : teachers.map(t => (
                <tr key={t.id}>
                  <td><div className="flex items-center gap-3"><Avatar name={t.full_name} />{t.full_name}</div></td>
                  <td>{t.employee_id}</td>
                  <td>{t.marked_at ? new Date(t.marked_at).toLocaleTimeString() : <Badge tone="bg-amber-50 text-amber-700">Not marked</Badge>}</td>
                  <td>
                    {canMark ? (
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map(([value, label]) => (
                          <button key={value} onClick={() => setStatus(t.id, value)} className={`status-choice ${t.status === value ? 'selected' : ''}`}>{label}</button>
                        ))}
                      </div>
                    ) : (
                      t.status ? <Badge tone={STATUS_TONE[t.status]}>{STATUSES.find(([v]) => v === t.status)?.[1] || t.status}</Badge> : <Badge tone="bg-slate-100 text-slate-500">Not marked</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
