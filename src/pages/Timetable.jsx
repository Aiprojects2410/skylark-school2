import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui'
import Modal from '../components/Modal'
import { getTimetableSlots, saveTimetableSlot, deleteTimetableSlot } from '../services/timetable'
import { getTeachers } from '../services/teachers'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const legacy = [
  { period: 'Period 1 (08:30 - 09:15 AM)', subject: 'Mathematics', teacher_name: 'Dr. Ramesh Gupta' },
  { period: 'Period 2 (09:15 - 10:00 AM)', subject: 'Physics', teacher_name: 'Sunita Mehra' },
  { period: 'Period 3 (10:00 - 10:45 AM)', subject: 'English', teacher_name: 'Amitabh Kumar' },
  { period: 'Break (10:45 - 11:15 AM)', subject: 'Recess', teacher_name: '—' },
  { period: 'Period 4 (11:15 - 12:00 PM)', subject: 'Computer Science', teacher_name: 'Priya Sharma' }
]

const MANAGE_ROLES = ['super_admin', 'admin', 'principal']

export default function Timetable() {
  const { role } = useAuth()
  const canManage = MANAGE_ROLES.includes(role)
  const [slots, setSlots] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ subject: '', day_of_week: 1, start_time: '08:30', end_time: '09:15', teacher_id: '', class_id: '', section_id: '' })
  const [loading, setLoading] = useState(true)
  const notify = useToast()

  const load = async () => {
    try {
      const [t, teachersData, classesResult] = await Promise.all([
        getTimetableSlots(),
        canManage ? getTeachers() : Promise.resolve([]),
        canManage && supabase ? supabase.from('classes').select('id,name').order('name') : Promise.resolve({ data: [] })
      ])
      setSlots(t); setTeachers(teachersData); setClasses(classesResult.data || [])
    } catch (e) { notify(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [role])

  const submit = async e => {
    e.preventDefault()
    if (!canManage) return
    try { await saveTimetableSlot({ ...form, teacher_id: form.teacher_id || null, class_id: form.class_id || null, section_id: form.section_id || null }); setShowModal(false); setForm({ subject: '', day_of_week: 1, start_time: '08:30', end_time: '09:15', teacher_id: '', class_id: '', section_id: '' }); await load() }
    catch (e) { notify(e.message) }
  }

  const remove = async id => {
    if (!canManage) return
    try { await deleteTimetableSlot(id); await load() } catch (e) { notify(e.message) }
  }

  return (
    <>
      <PageHeader
        eyebrow="SCHEDULE"
        title="Class Timetable"
        subtitle={canManage ? 'Daily period schedule, subject allocations, and teacher assignments.' : 'View the class timetable. This section is read-only.'}
        action={canManage ? <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Timetable</button> : null}
      />
      <div className="card overflow-x-auto">
        {loading ? <p className="p-5 text-sm text-slate-400">Loading timetable…</p> : <table>
          <thead><tr><th>Day</th><th>Time / Period</th><th>Subject</th><th>Teacher</th><th>Class</th>{canManage && <th>Actions</th>}</tr></thead>
          <tbody>
            {slots.map(s => <tr key={s.id}><td>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day_of_week]}</td><td className="font-semibold text-brand">{s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}</td><td>{s.subject}</td><td>{s.teacher_name || '—'}</td><td>{s.class_name ? `${s.class_name}${s.section_name ? ` ${s.section_name}` : ''}` : '—'}</td>{canManage && <td><button className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => remove(s.id)}>Delete</button></td>}</tr>)}
            {!slots.length && legacy.map((s, i) => <tr key={`legacy-${i}`}><td>—</td><td className="font-semibold text-brand">{s.period}</td><td>{s.subject}</td><td>{s.teacher_name}</td><td>—</td>{canManage && <td className="text-xs text-slate-400">Legacy</td>}</tr>)}
          </tbody>
        </table>}
      </div>
      {showModal && canManage && <Modal title="Add Timetable Entry" onClose={() => setShowModal(false)}><form onSubmit={submit} className="space-y-4 p-5">
        <label className="block text-sm font-medium">Subject<input required className="input mt-1" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Day<select className="input mt-1" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: Number(e.target.value) })}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label><label className="text-sm font-medium">Teacher<select className="input mt-1" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}><option value="">Select teacher</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>)}</select></label></div>
        <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Start<input type="time" required className="input mt-1" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></label><label className="text-sm font-medium">End<input type="time" required className="input mt-1" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></label><label className="text-sm font-medium">Class<select className="input mt-1" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}><option value="">Select class</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-primary">Save timetable</button></div>
      </form></Modal>}
    </>
  )
}
