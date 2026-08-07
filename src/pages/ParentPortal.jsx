import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Avatar, Badge, PageHeader } from '../components/ui'
import { getMyChildren } from '../services/parents'
import { getInvoices } from '../services/fees'
import { getNotices } from '../services/notices'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function ParentPortal() {
  const [children, setChildren] = useState([])
  const [active, setActive] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const notify = useToast()

  useEffect(() => {
    Promise.all([getMyChildren(profile?.id), getInvoices(), getNotices()])
      .then(([kids, inv, n]) => { setChildren(kids); setActive(kids[0]?.id || null); setInvoices(inv); setNotices(n) })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false))
  }, [profile?.id])

  const selected = children.find(c => c.id === active)
  const childInvoices = invoices.filter(i => i.student_id === active || i.student_name === selected?.full_name)

  return (
    <>
      <PageHeader eyebrow="PARENT PORTAL" title="My children" subtitle="Attendance, fees, homework and notices in one place." />
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : children.length === 0 ? (
        <p className="text-sm text-slate-400">No children are linked to your account yet. Please contact the school office.</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {children.map(c => (
              <button key={c.id} onClick={() => setActive(c.id)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${active === c.id ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                <Avatar name={c.full_name} />{c.full_name}
              </button>
            ))}
          </div>

          {selected && (
            <div className="grid gap-5 lg:grid-cols-3">
              <section className="card">
                <div className="flex items-center gap-3"><GraduationCap className="text-brand" /><h2 className="section-title">Profile</h2></div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Student ID</dt><dd>{selected.student_id}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Class</dt><dd>{selected.class_name} {selected.section_name}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Relationship</dt><dd className="capitalize">{selected.relationship}</dd></div>
                </dl>
              </section>

              <section className="card">
                <h2 className="section-title">Fee status</h2>
                <div className="mt-4 space-y-2">
                  {childInvoices.length === 0 ? <p className="text-sm text-slate-400">No records found.</p> : childInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between text-sm"><span>{inv.receipt || inv.id}</span><Badge tone={inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{inv.status}</Badge></div>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2 className="section-title">Latest notices</h2>
                <div className="mt-4 space-y-3">
                  {notices.slice(0, 3).map(n => <div key={n.id}><p className="text-sm font-semibold text-ink dark:text-white">{n.title}</p><p className="text-xs text-slate-400">{String(n.published_at).slice(0, 10)}</p></div>)}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </>
  )
}
