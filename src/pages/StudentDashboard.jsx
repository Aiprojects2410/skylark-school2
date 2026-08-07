import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { CalendarCheck, Download, GraduationCap, TrendingUp } from 'lucide-react'
import { PageHeader, Stat } from '../components/ui'
import { getStudentPortalSummary } from '../services/studentPortal'
import { getInvoices } from '../services/fees'
import { getNotices } from '../services/notices'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function StudentDashboard() {
  const [summary, setSummary] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [invoices, setInvoices] = useState([])
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const { session, profile } = useAuth()
  const notify = useToast()

  useEffect(() => {
    Promise.all([getStudentPortalSummary(session?.user?.id), getInvoices(), getNotices()])
      .then(([s, inv, n]) => { setSummary(s); setInvoices(inv); setNotices(n); if (s?.student.qr_token) QRCode.toDataURL(s.student.qr_token, { margin: 1, width: 200 }).then(setQrUrl) })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false))
  }, [session?.user?.id])

  const outstanding = invoices.filter(i => i.status !== 'paid')

  return (
    <>
      <PageHeader eyebrow="STUDENT PORTAL" title={`Hi, ${profile?.full_name?.split(' ')[0] || 'there'} 👋`} subtitle="Your attendance, fees, homework and ID card." />

      {loading ? <p className="text-sm text-slate-400">Loading…</p> : !summary ? (
        <p className="text-sm text-slate-400">Your student record isn't linked yet. Please contact the school office.</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Attendance this month" value={`${summary.percent}%`} icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" note={`${summary.present} present of ${summary.total} days`} />
            <Stat label="Class" value={`${summary.student.class_name || '—'} ${summary.student.section_name || ''}`} icon={GraduationCap} tone="bg-blue-50 text-brand" note={summary.student.student_id} />
            <Stat label="Fee status" value={outstanding.length ? 'Due' : 'Paid'} icon={CalendarCheck} tone={outstanding.length ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} note={`${outstanding.length} pending invoice(s)`} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]">
            <section className="card">
              <h2 className="section-title">Latest notices</h2>
              <div className="mt-4 space-y-3">
                {notices.slice(0, 4).map(n => <div key={n.id}><p className="text-sm font-semibold text-ink dark:text-white">{n.title}</p><p className="text-xs text-slate-400">{String(n.published_at).slice(0, 10)}</p></div>)}
              </div>
            </section>

            <section className="card text-center">
              <h2 className="section-title">My QR Code</h2>
              <p className="section-subtitle">Show this at the gate or to your teacher for attendance.</p>
              {qrUrl && <img src={qrUrl} alt="My QR code" className="mx-auto mt-4 h-40 w-40" />}
              <a href={qrUrl} download={`${summary.student.student_id}-qr.png`} className="btn-secondary mt-4 inline-flex"><Download size={15} /> Download QR (PNG)</a>
            </section>
          </div>
        </>
      )}
    </>
  )
}
