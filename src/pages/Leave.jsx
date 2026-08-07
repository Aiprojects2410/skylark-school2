import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'
import Modal from '../components/Modal'
import { applyLeave, getLeaveRequests, reviewLeave } from '../services/leave'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUS_TONE = { pending: 'bg-amber-50 text-amber-700', approved: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-700' }

export default function Leave() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' })
  const { profile, role } = useAuth()
  const notify = useToast()
  const canReview = ['super_admin', 'admin', 'principal'].includes(role)

  useEffect(() => { load() }, [])
  function load() { setLoading(true); getLeaveRequests().then(setRequests).catch(e => notify(e.message)).finally(() => setLoading(false)) }

  async function submit(e) {
    e.preventDefault()
    try {
      const created = await applyLeave({ applicant_id: profile?.id, applicant_role: role, ...form })
      setRequests(v => [{ ...created, applicant_name: profile?.full_name }, ...v])
      setModal(false)
      setForm({ start_date: '', end_date: '', reason: '' })
      notify('Leave request submitted.')
    } catch (e) { notify(e.message) }
  }

  async function review(id, status) {
    try { await reviewLeave(id, status, profile?.id); setRequests(v => v.map(r => r.id === id ? { ...r, status } : r)); notify(`Request ${status}.`) }
    catch (e) { notify(e.message) }
  }

  return (
    <>
      <PageHeader eyebrow="LEAVE" title="Leave management" subtitle="Apply for leave, or review pending requests."
        action={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Apply for leave</button>} />
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Applicant</th><th>Role</th><th>Dates</th><th>Reason</th><th>Status</th>{canReview && <th className="text-right">Actions</th>}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="p-8 text-center">Loading…</td></tr> : requests.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold text-ink dark:text-white">{r.applicant_name}</td>
                  <td className="capitalize">{r.applicant_role}</td>
                  <td>{r.start_date} → {r.end_date}</td>
                  <td className="max-w-xs truncate">{r.reason}</td>
                  <td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                  {canReview && (
                    <td className="text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => review(r.id, 'approved')} className="text-sm font-semibold text-emerald-600">Approve</button>
                          <button onClick={() => review(r.id, 'rejected')} className="text-sm font-semibold text-rose-600">Reject</button>
                        </div>
                      ) : <span className="text-xs text-slate-400">Reviewed</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <Modal title="Apply for leave" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">From<input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input mt-1.5" /></label>
              <label className="text-sm font-medium">To<input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input mt-1.5" /></label>
            </div>
            <label className="block text-sm font-medium">Reason<textarea required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="input mt-1.5 min-h-24" /></label>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button className="btn-primary">Submit request</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
