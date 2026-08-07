import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CheckCircle2, ClipboardList, QrCode, TrendingUp } from 'lucide-react'
import { PageHeader, Stat } from '../components/ui'
import { getTeacherPortalSummary, DAYS } from '../services/teacherPortal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function TeacherDashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const notify = useToast()

  useEffect(() => { getTeacherPortalSummary(profile?.id).then(setSummary).catch(e => notify(e.message)).finally(() => setLoading(false)) }, [profile?.id])

  const monthPercent = summary?.workingDays ? Math.round(((summary.present + summary.late + summary.halfDay) / summary.workingDays) * 100) : 0

  return (
    <>
      <PageHeader eyebrow="TEACHER PORTAL" title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'Teacher'}`} subtitle={DAYS[new Date().getDay()] + ' · Today at a glance'}
        action={<Link to="/scanner" className="btn-primary"><QrCode size={16} /> Open Scanner</Link>} />

      {loading ? <p className="text-sm text-slate-400">Loading…</p> : !summary ? (
        <p className="text-sm text-slate-400">No teacher profile is linked to your account yet. Please contact the admin office.</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Today's classes" value={summary.todaysClasses.length} icon={CalendarClock} tone="bg-blue-50 text-brand" />
            <Stat label="This month's attendance" value={`${monthPercent}%`} icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" note={`${summary.present} present · ${summary.absent} absent · ${summary.late} late`} />
            <Stat label="Leave balance" value={summary.leaveBalance} icon={ClipboardList} tone="bg-amber-50 text-amber-600" note={`${summary.leavesTaken} taken · ${summary.pendingLeaves} pending`} />
            <Stat label="Working days logged" value={summary.workingDays} icon={CheckCircle2} tone="bg-violet-50 text-violet-600" note="This month" />
          </section>

          <section className="card mt-6">
            <h2 className="section-title">Today's classes</h2>
            <div className="mt-4 space-y-2">
              {summary.todaysClasses.length === 0 ? <p className="text-sm text-slate-400">No periods scheduled today.</p> : summary.todaysClasses.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                  <div><p className="font-semibold text-ink dark:text-white">{c.subject}</p><p className="text-xs text-slate-400">{c.class_name} {c.section_name}</p></div>
                  <p className="text-xs text-slate-400">{c.start_time?.slice(0, 5)}–{c.end_time?.slice(0, 5)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
