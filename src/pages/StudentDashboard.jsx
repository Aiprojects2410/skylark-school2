import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { GraduationCap } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { getStudentPortalSummary } from '../services/studentPortal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function StudentDashboard() {
  const [summary, setSummary] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const { session, profile } = useAuth()
  const notify = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStudentPortalSummary(session?.user?.id)
      .then(async s => {
        if (cancelled) return
        setSummary(s)
        if (s?.student?.qr_token) {
          const url = await QRCode.toDataURL(s.student.qr_token, { margin: 1, width: 240 })
          if (!cancelled) setQrUrl(url)
        } else {
          setQrUrl('')
        }
      })
      .catch(e => notify(e.message))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  const studentName = summary?.student?.full_name || profile?.full_name || 'Student'

  return (
    <>
      <PageHeader
        eyebrow="STUDENT PORTAL"
        title={studentName}
        subtitle="Your student profile and QR identity card."
      />

      {loading ? (
        <p className="text-sm text-slate-400">Loading student profile…</p>
      ) : !summary ? (
        <p className="text-sm text-slate-400">Your student record isn't linked yet. Please contact the school office.</p>
      ) : (
        <div className="mx-auto max-w-2xl">
          <section className="card text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
              <GraduationCap size={32} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-ink dark:text-white">{studentName}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {summary.student.student_id || 'Student'}
              {summary.student.class_name ? ` · ${summary.student.class_name}` : ''}
              {summary.student.section_name ? ` · ${summary.student.section_name}` : ''}
            </p>

            <div className="mx-auto mt-7 flex min-h-72 w-full max-w-sm items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              {qrUrl ? (
                <img src={qrUrl} alt="Student QR code" className="h-60 w-60" />
              ) : (
                <p className="text-sm text-slate-400">QR code is not available for this student.</p>
              )}
            </div>

            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Show this QR code at the school gate or to your teacher for attendance.</p>
          </section>
        </div>
      )}
    </>
  )
}
