import { useEffect, useState } from 'react'
import { BookOpen, CalendarCheck, CircleDollarSign, ClipboardList, GraduationCap, Plus, Users } from 'lucide-react'
import { Stat } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getStudents } from '../services/students'
import { getTeachers } from '../services/teachers'
import { getNotices } from '../services/notices'
import { getClasses } from '../services/classes'
import { getSchoolAttendanceOverview } from '../services/attendance'
import { getInvoices } from '../services/fees'

const inLakh = n => `₹${(n / 100000).toFixed(2)}L`

export default function Dashboard() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [notices, setNotices] = useState([])
  const [classes, setClasses] = useState([])
  const [attendance, setAttendance] = useState({ overallPercent: 0, classes: [] })
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStudents(), getTeachers(), getNotices(), getClasses(), getSchoolAttendanceOverview(), getInvoices()])
      .then(([s, t, n, c, a, inv]) => { setStudents(s); setTeachers(t); setNotices(n); setClasses(c); setAttendance(a); setInvoices(inv) })
      .finally(() => setLoading(false))
  }, [])

  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || i.total_amount || 0), 0)
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + Number(i.amount || i.total_amount || 0), 0)
  const attendanceMarked = attendance.classes.reduce((s, c) => s + c.total, 0)
  const attendancePresent = attendance.classes.reduce((s, c) => s + c.present, 0)

  const stats = [
    ['Total Students', loading ? '—' : students.length, GraduationCap, 'bg-blue-50 text-brand', 'Active enrolled students'],
    ['Total Teachers', loading ? '—' : teachers.length, Users, 'bg-violet-50 text-violet-600', 'Across all departments'],
    ['Total Classes', loading ? '—' : classes.length, BookOpen, 'bg-amber-50 text-amber-600', 'Nursery to Class 12'],
    ["Today's Attendance", loading ? '—' : `${attendance.overallPercent}%`, CalendarCheck, 'bg-emerald-50 text-emerald-600', attendanceMarked ? `${attendancePresent} of ${attendanceMarked} marked` : 'No records marked yet'],
    ['Fees Collected', loading ? '—' : inLakh(totalCollected), CircleDollarSign, 'bg-cyan-50 text-cyan-600', 'All time'],
    ['Pending Fees', loading ? '—' : inLakh(totalPending), ClipboardList, 'bg-rose-50 text-rose-600', 'Outstanding'],
  ]

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">TODAY</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-white sm:text-3xl">
            Good morning, {profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening at Skylark School today.</p>
        </div>
        <button className="btn-primary"><Plus size={17} /> Quick add</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([a, b, c, d, e]) => <Stat key={a} label={a} value={b} icon={c} tone={d} note={e} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
        <section className="card">
          <div className="flex items-center justify-between">
            <div><h2 className="section-title">Recent notices</h2><p className="section-subtitle">Latest school updates</p></div>
          </div>
          <div className="mt-5 space-y-1">
            {notices.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No notices published yet.</p> : notices.slice(0, 4).map(n => (
              <div key={n.id} className="flex gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand" />
                <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.title}</p><p className="mt-1 text-xs text-slate-400">{String(n.published_at).slice(0, 10)}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <div><h2 className="section-title">Notice board</h2><p className="section-subtitle">Keep the school community informed</p></div>
          </div>
          <div className="mt-4 space-y-2">
            {notices.length === 0 ? <p className="text-sm text-slate-400">Nothing published yet.</p> : notices.slice(0, 3).map(n => (
              <article key={n.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <span className="badge bg-blue-50 text-brand">{n.category}</span>
                <h3 className="mt-2 text-sm font-semibold text-ink dark:text-white">{n.title}</h3>
                <p className="mt-2 text-xs text-slate-400">{String(n.published_at).slice(0, 10)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
