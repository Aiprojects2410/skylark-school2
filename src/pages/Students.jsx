import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Avatar, Badge, PageHeader } from '../components/ui'
import Modal from '../components/Modal'
import StudentForm from '../components/StudentForm'
import CredentialsModal from '../components/CredentialsModal'
import { createStudentLogin, deleteStudent, getStudents, saveStudent } from '../services/students'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Students() {
  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const { role } = useAuth()
  const notify = useToast()
  // Only Admin and Super Admin may manage or delete students.
  const canManage = ['super_admin', 'admin'].includes(role)

  useEffect(() => { load() }, [])
  function load() { setLoading(true); getStudents().then(setStudents).catch(e => notify(e.message)).finally(() => setLoading(false)) }

  const classNames = useMemo(() => [...new Set(students.map(s => s.class_name).filter(Boolean))].sort(), [students])
  const filtered = useMemo(() => students
    .filter(s => classFilter === 'all' || s.class_name === classFilter)
    .filter(s => Object.values(s).some(v => String(v || '').toLowerCase().includes(query.toLowerCase()))),
    [students, query, classFilter])
  const grouped = useMemo(() => {
    const byClass = {}
    filtered.forEach(s => {
      const cls = s.class_name || 'Unassigned'
      const sec = s.section_name || '—'
      byClass[cls] ||= {}
      byClass[cls][sec] ||= []
      byClass[cls][sec].push(s)
    })
    return Object.entries(byClass).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  async function upsert(s) {
    try {
      const saved = await saveStudent(s)
      setStudents(v => s.id ? v.map(x => x.id === s.id ? { ...x, ...saved } : x) : [saved, ...v])
      setModal(null)
      notify('Student saved successfully.')
    } catch (e) { notify(e.message) }
  }

  async function remove(s) {
    if (!confirm(`Delete ${s.full_name}? This will remove the student record and linked login.`)) return
    setDeletingId(s.id)
    try { await deleteStudent(s.id); setStudents(v => v.filter(x => x.id !== s.id)); notify('Student deleted.') }
    catch (e) { notify(e.message) }
    finally { setDeletingId(null) }
  }

  async function createLogin(s) {
    try { const creds = await createStudentLogin(s.id); setCredentials(creds); notify('Login created.') }
    catch (e) { notify(e.message) }
  }

  return (
    <>
      <PageHeader eyebrow="STUDENT DIRECTORY" title="Students" subtitle={canManage ? "Manage admissions, profiles and guardians — grouped by class." : "Student directory — read only."}
        action={canManage && <button onClick={() => setModal({})} className="btn-primary"><Plus size={17} /> Add student</button>} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink dark:text-white">{filtered.length} of {students.length} students</p>
        <div className="flex flex-wrap items-center gap-3">
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input w-auto"><option value="all">All classes</option>{classNames.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} className="bg-transparent outline-none" placeholder="Search students" /></label>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading students…</p> : grouped.length === 0 ? <p className="text-sm text-slate-400">No students found.</p> : (
        <div className="space-y-6">{grouped.map(([className, sections]) => (
          <section key={className} className="card overflow-hidden !p-0">
            <div className="border-b bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50"><p className="font-bold text-ink dark:text-white">{className}</p></div>
            {Object.entries(sections).sort(([a], [b]) => a.localeCompare(b)).map(([sectionName, list]) => (
              <div key={sectionName} className="overflow-x-auto">
                <p className="px-5 pt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Section {sectionName} · {list.length} students</p>
                <table><thead><tr><th>Student</th><th>Admission no.</th><th>Guardian</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>{list.map(s => <tr key={s.id}>
                    <td><div className="flex items-center gap-3"><Avatar name={s.full_name} /><div><p className="font-semibold text-ink dark:text-white">{s.full_name}</p><p className="text-xs text-slate-400">{s.student_id}</p></div></div></td>
                    <td>{s.admission_number || '—'}</td><td><p>{s.parent_name || s.father_name || '—'}</p><p className="text-xs text-slate-400">{s.parent_phone}</p></td><td><Badge>{s.status || 'active'}</Badge></td>
                    <td className="text-right">{canManage ? <><button onClick={() => setModal(s)} className="mr-3 text-sm font-semibold text-brand">Edit</button><button onClick={() => createLogin(s)} className="mr-3 text-sm font-semibold text-emerald-600">{s.auth_user_id ? 'Reset login' : 'Create login'}</button><button disabled={deletingId === s.id} onClick={() => remove(s)} className="text-sm font-semibold text-rose-600 disabled:opacity-50">{deletingId === s.id ? 'Deleting…' : 'Delete'}</button></> : <span className="text-xs text-slate-400">View only</span>}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            ))}
          </section>
        ))}</div>
      )}
      {modal && <Modal title={modal.id ? 'Edit student' : 'Add student'} onClose={() => setModal(null)}><StudentForm student={modal} onSave={upsert} onCancel={() => setModal(null)} /></Modal>}
      {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
    </>
  )
}
