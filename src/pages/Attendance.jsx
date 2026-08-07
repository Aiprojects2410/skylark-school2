import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarCheck, ChevronRight, Clock, Users } from 'lucide-react'
import { Avatar, Badge, PageHeader, Stat } from '../components/ui'
import {
  getClassesWithCounts, getSectionAttendance, getSchoolAttendanceOverview,
  markAttendance, subscribeToAttendance, todayISO,
} from '../services/attendance'
import { useToast } from '../context/ToastContext'

const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half day' }
const STATUS_TONE = {
  present: 'bg-emerald-50 text-emerald-700', absent: 'bg-rose-50 text-rose-700',
  late: 'bg-amber-50 text-amber-700', half_day: 'bg-blue-50 text-brand',
}

export default function Attendance() {
  const [date, setDate] = useState(todayISO())
  const [classes, setClasses] = useState([])
  const [overview, setOverview] = useState({ overallPercent: 0, classes: [] })
  const [activeClass, setActiveClass] = useState(null)
  const [activeSection, setActiveSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const notify = useToast()

  useEffect(() => {
    setLoading(true)
    Promise.all([getClassesWithCounts(), getSchoolAttendanceOverview(date)])
      .then(([c, o]) => { setClasses(c); setOverview(o) })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false))
  }, [date])

  if (activeSection) return <SectionView section={activeSection} classInfo={activeClass} date={date} onBack={() => setActiveSection(null)} notify={notify} />

  if (activeClass) {
    return (
      <>
        <PageHeader eyebrow="ATTENDANCE" title={activeClass.name} subtitle="Select a section to view or mark attendance."
          action={<button onClick={() => setActiveClass(null)} className="btn-secondary"><ArrowLeft size={16} /> All classes</button>} />
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeClass.sections.length === 0 ? <p className="text-sm text-slate-400">No sections in this class yet.</p> : activeClass.sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s)} className="card flex items-center justify-between text-left hover:ring-2 hover:ring-brand/20">
              <div><p className="font-bold text-ink dark:text-white">Section {s.name}</p><p className="mt-1 text-sm text-slate-500">{s.studentCount} students</p></div>
              <ChevronRight className="text-slate-300" />
            </button>
          ))}
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow="ATTENDANCE" title="Attendance" subtitle="School-wide overview, drill into any class and section."
        action={<input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-auto" />} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Overall attendance today" value={`${overview.overallPercent}%`} icon={CalendarCheck} tone="bg-emerald-50 text-emerald-600" note="Across all classes" />
        <Stat label="Total classes" value={classes.length} icon={Users} tone="bg-blue-50 text-brand" note="Nursery to Class 12" />
        <Stat label="Records marked today" value={overview.classes.reduce((s, c) => s + c.total, 0)} icon={Clock} tone="bg-amber-50 text-amber-600" note="Manual + QR scans" />
      </section>

      <section className="card mt-6">
        <h2 className="section-title">Classes</h2>
        {loading ? <p className="mt-3 text-sm text-slate-400">Loading…</p> : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map(c => {
              const stat = overview.classes.find(x => x.name === c.name)
              const totalStudents = c.sections.reduce((s, sec) => s + sec.studentCount, 0)
              return (
                <button key={c.id} onClick={() => setActiveClass(c)} className="rounded-xl border border-slate-100 p-4 text-left hover:border-brand/40 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-ink dark:text-white">{c.name}</p>
                    <Badge tone={stat ? 'bg-emerald-50 text-emerald-700' : ''}>{stat ? `${stat.percent}%` : 'No data'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{c.sections.length} section(s) · {totalStudents} students</p>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

function SectionView({ section, classInfo, date, onBack, notify }) {
  const [data, setData] = useState({ students: [], summary: { total: 0, present: 0, absent: 0, late: 0, half_day: 0, percent: 0 } })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localStatus, setLocalStatus] = useState({})

  function load() {
    setLoading(true)
    getSectionAttendance(section.id, date).then(d => { setData(d); setLocalStatus(Object.fromEntries(d.students.map(s => [s.id, s.status || 'present']))) }).catch(e => notify(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [section.id, date])
  useEffect(() => subscribeToAttendance(date, load), [date]) // live-updates counters/list as QR scans come in

  async function saveManual() {
    setSaving(true)
    try {
      await markAttendance(Object.entries(localStatus).map(([student_id, status]) => ({ student_id, status })), date)
      notify('Attendance saved.')
      load()
    } catch (e) { notify(e.message) } finally { setSaving(false) }
  }

  const { summary, students } = data

  return (
    <>
      <PageHeader eyebrow={classInfo?.name} title={`Section ${section.name}`} subtitle="Today's attendance summary and student list."
        action={<button onClick={onBack} className="btn-secondary"><ArrowLeft size={16} /> Back to sections</button>} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[['Total', summary.total, ''], ['Present', summary.present, 'text-emerald-600'], ['Absent', summary.absent, 'text-rose-600'], ['Late', summary.late, 'text-amber-600'], ['Half day', summary.half_day, 'text-brand']].map(([label, val, tone]) => (
          <div key={label} className="card text-center"><p className={`text-2xl font-bold ${tone}`}>{val}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
        ))}
      </section>
      <section className="card mt-4">
        <div className="flex items-center justify-between"><p className="font-semibold text-ink dark:text-white">Attendance percentage</p><p className="text-2xl font-bold text-brand">{summary.percent}%</p></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand" style={{ width: `${summary.percent}%` }} /></div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b p-4 dark:border-slate-800">
          <p className="font-semibold text-ink dark:text-white">Students</p>
          <button onClick={saveManual} disabled={saving || loading} className="btn-primary disabled:opacity-60">{saving ? 'Saving…' : 'Save manual changes'}</button>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Student</th><th>Roll / Student ID</th><th>Scan time</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="p-8 text-center">Loading…</td></tr> : students.map(s => (
                <tr key={s.id}>
                  <td><div className="flex items-center gap-3"><Avatar name={s.full_name} />{s.full_name}</div></td>
                  <td>{s.student_id}</td>
                  <td>{s.scan_time ? new Date(s.scan_time).toLocaleTimeString() : '—'}</td>
                  <td>
                    <div className="flex gap-1.5">
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <button key={value} onClick={() => setLocalStatus(m => ({ ...m, [s.id]: value }))}
                          className={`status-choice ${localStatus[s.id] === value ? 'selected' : ''}`}>{label}</button>
                      ))}
                    </div>
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
