import { useEffect, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'
import Modal from '../components/Modal'
import { createHomework, getHomework } from '../services/homework'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Homework() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', subject: '', description: '', due_date: '' })
  const { role } = useAuth()
  const notify = useToast()
  const canCreate = ['super_admin', 'admin', 'principal', 'teacher'].includes(role)

  useEffect(() => { getHomework().then(setItems).catch(e => notify(e.message)).finally(() => setLoading(false)) }, [])

  async function submit(e) {
    e.preventDefault()
    try {
      const created = await createHomework(form)
      setItems(v => [created, ...v])
      setModal(false)
      setForm({ title: '', subject: '', description: '', due_date: '' })
      notify('Homework assigned.')
    } catch (e) { notify(e.message) }
  }

  return (
    <>
      <PageHeader eyebrow="ACADEMICS" title="Homework" subtitle="Assignments, due dates and submissions."
        action={canCreate && <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Assign homework</button>} />
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <section className="grid gap-4 md:grid-cols-2">
          {items.map(h => (
            <article key={h.id} className="card">
              <div className="flex items-start justify-between"><BookOpen className="text-brand" /><Badge>{h.subject}</Badge></div>
              <h2 className="mt-3 font-bold text-ink dark:text-white">{h.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{h.description}</p>
              <p className="mt-3 text-xs text-slate-400">Due {h.due_date} {h.class_name && `· ${h.class_name} ${h.section_name || ''}`}</p>
            </article>
          ))}
        </section>
      )}
      {modal && (
        <Modal title="Assign homework" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="block text-sm font-medium">Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input mt-1.5" /></label>
            <label className="block text-sm font-medium">Subject<input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input mt-1.5" /></label>
            <label className="block text-sm font-medium">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input mt-1.5 min-h-24" /></label>
            <label className="block text-sm font-medium">Due date<input type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input mt-1.5" /></label>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button className="btn-primary">Assign</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
