import { useEffect, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'
import Modal from '../components/Modal'
import { createNotice, getNotices } from '../services/notices'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ROLES = ['student', 'teacher', 'admin', 'principal', 'super_admin']

export default function Notices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'general', target_roles: [] })
  const { role } = useAuth()
  const notify = useToast()
  const canCreate = ['super_admin', 'admin', 'principal'].includes(role)

  useEffect(() => { load() }, [])
  function load() { setLoading(true); getNotices().then(setNotices).catch(e => notify(e.message)).finally(() => setLoading(false)) }

  function toggleRole(r) {
    setForm(f => ({ ...f, target_roles: f.target_roles.includes(r) ? f.target_roles.filter(x => x !== r) : [...f.target_roles, r] }))
  }

  async function submit(e) {
    e.preventDefault()
    try {
      const payload = { ...form, target_roles: form.target_roles.length ? form.target_roles : null }
      const created = await createNotice(payload)
      setNotices(v => [created, ...v])
      setModal(false)
      setForm({ title: '', body: '', category: 'general', target_roles: [] })
      notify('Notice published.')
    } catch (e) { notify(e.message) }
  }

  return (
    <>
      <PageHeader eyebrow="COMMUNICATION" title="Notice board" subtitle="Real-time announcements, filterable by role."
        action={canCreate && <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Create notice</button>} />
      <section className="card">
        <div className="space-y-2">
          {loading ? <p className="p-4 text-sm text-slate-400">Loading…</p> : notices.map(n => (
            <article key={n.id} className="rounded-xl border border-slate-100 p-4 transition hover:border-brand/30 dark:border-slate-800">
              <div className="flex justify-between gap-3">
                <div>
                  <span className="badge bg-blue-50 text-brand">{n.category}</span>
                  <h3 className="mt-2 text-sm font-semibold text-ink dark:text-white">{n.title}</h3>
                  {n.body && <p className="mt-1 text-sm text-slate-500">{n.body}</p>}
                  {n.target_roles && <div className="mt-2 flex flex-wrap gap-1">{n.target_roles.map(r => <Badge key={r}>{r}</Badge>)}</div>}
                </div>
                <ChevronRight className="mt-2 shrink-0 text-slate-300" size={18} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{String(n.published_at).slice(0, 10)}</p>
            </article>
          ))}
        </div>
      </section>

      {modal && (
        <Modal title="Create notice" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="block text-sm font-medium">Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input mt-1.5" /></label>
            <label className="block text-sm font-medium">Details<textarea required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input mt-1.5 min-h-24" /></label>
            <label className="block text-sm font-medium">Category
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input mt-1.5">
                <option value="general">General</option><option value="academic">Academic</option><option value="event">Event</option>
              </select>
            </label>
            <div>
              <p className="text-sm font-medium">Visible to (leave blank for everyone)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLES.map(r => (
                  <button type="button" key={r} onClick={() => toggleRole(r)} className={`badge ${form.target_roles.includes(r) ? 'bg-brand text-white' : ''}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button className="btn-primary">Publish</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
