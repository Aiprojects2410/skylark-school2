import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui'
import TeacherForm from '../components/TeacherForm'
import CredentialsModal from '../components/CredentialsModal'
import Modal from '../components/Modal'
import { createTeacherLogin, deleteTeacher, getTeachers, saveTeacher } from '../services/teachers'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Teachers() {
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [credentials, setCredentials] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const { role } = useAuth()
  const notify = useToast()
  const canManage = ['super_admin', 'admin'].includes(role)

  const load = async () => {
    try { setTeachers(await getTeachers()) }
    catch (e) { notify(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleSave = async (data) => {
    try { await saveTeacher(data); await load(); setShowModal(false); setEditingTeacher(null) }
    catch (e) { notify(e.message) }
  }

  const handleLogin = async (teacher) => {
    setBusyId(teacher.id)
    try {
      const result = await createTeacherLogin(teacher.id)
      setCredentials({ ...result, username: result?.username || teacher.employee_id, email: result?.email || teacher.email })
      await load()
    } catch (e) { notify(e.message) }
    finally { setBusyId(null) }
  }

  const handleDelete = async (teacher) => {
    if (!confirm(`Delete ${teacher.full_name || teacher.employee_id}? This will remove the teacher record and linked login.`)) return
    setDeletingId(teacher.id)
    try { await deleteTeacher(teacher.id); setTeachers(v => v.filter(x => x.id !== teacher.id)); notify('Teacher deleted.') }
    catch (e) { notify(e.message) }
    finally { setDeletingId(null) }
  }

  return (
    <>
      <PageHeader eyebrow="FACULTY" title="Teacher Directory" subtitle="Manage teaching staff profiles, qualifications, contacts, QR identity and logins."
        action={canManage && <button className="btn-primary" onClick={() => { setEditingTeacher(null); setShowModal(true) }}>+ Add New Teacher</button>} />
      <div className="card overflow-x-auto">
        {loading ? <p className="p-5 text-sm text-slate-400">Loading teachers…</p> : <table>
          <thead><tr><th>Employee ID</th><th>Name</th><th>Qualification</th><th>Phone</th><th>Email</th><th>Login</th><th>Actions</th></tr></thead>
          <tbody>{teachers.map(t => <tr key={t.id}>
            <td className="font-semibold text-brand">{t.employee_id || '—'}</td><td className="font-medium text-ink dark:text-white">{t.full_name || '—'}</td><td>{t.qualification || '—'}</td><td>{t.phone || '—'}</td><td>{t.email || '—'}</td>
            <td>{canManage ? (t.auth_user_id || t.profile_id ? <button disabled={busyId === t.id} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50" onClick={() => handleLogin(t)}>{busyId === t.id ? 'Resetting…' : 'Reset login'}</button> : <button disabled={busyId === t.id} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50" onClick={() => handleLogin(t)}>{busyId === t.id ? 'Creating…' : 'Create login'}</button>) : <span className="text-xs text-slate-400">View only</span>}</td>
            <td>{canManage ? <><button className="mr-3 text-xs font-semibold text-brand hover:underline" onClick={() => { setEditingTeacher(t); setShowModal(true) }}>Edit</button><button disabled={deletingId === t.id} className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50" onClick={() => handleDelete(t)}>{deletingId === t.id ? 'Deleting…' : 'Delete'}</button></> : <span className="text-xs text-slate-400">View only</span>}</td>
          </tr>)}{!teachers.length && <tr><td colSpan="7" className="py-8 text-center text-sm text-slate-400">No teachers found.</td></tr>}</tbody>
        </table>}
      </div>
      {showModal && <Modal title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'} onClose={() => setShowModal(false)}><TeacherForm teacher={editingTeacher || {}} onSave={handleSave} onCancel={() => setShowModal(false)} /></Modal>}
      {credentials && <CredentialsModal credentials={credentials} title="Teacher login credentials" onClose={() => setCredentials(null)} />}
    </>
  )
}
