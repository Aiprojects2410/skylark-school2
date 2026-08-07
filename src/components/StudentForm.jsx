import { useEffect, useState } from 'react'
import PhotoUpload from './PhotoUpload'
import { getClasses } from '../services/classes'

const basicFields = [['full_name', 'Full name'], ['email', 'Email']]
const parentFields = [['father_name', 'Father name'], ['mother_name', 'Mother name'], ['parent_name', 'Guardian name (if different)'], ['parent_phone', 'Parent phone']]
const govFields = [['pen_number', 'PEN Number'], ['apaar_id', 'APAAR ID'], ['aadhaar_number', 'Aadhaar Number']]

export default function StudentForm({ student = {}, onSave, onCancel }) {
  const [form, setForm] = useState({ status: 'active', ...student })
  const [classes, setClasses] = useState([])
  const [showGov, setShowGov] = useState(false)

  useEffect(() => { getClasses().then(setClasses).catch(() => {}) }, [])

  const selectedClass = classes.find(c => c.id === form.class_id)
  const sections = selectedClass?.sections || []
  const submit = e => { e.preventDefault(); onSave(form) }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={submit} className="p-5">
      <PhotoUpload value={form.photo_url} onChange={url => set('photo_url', url)} folder="students" />

      {form.student_id && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-brand dark:bg-blue-950/30">Student ID: {form.student_id}</p>}
      {!form.id && <p className="mt-4 text-xs text-slate-400">Student ID and Admission Number are generated automatically once saved. A login can be created afterwards.</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {basicFields.map(([name, label]) => (
          <label key={name} className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}
            <input required={name === 'full_name'} value={form[name] || ''} onChange={e => set(name, e.target.value)} className="input mt-1.5" />
          </label>
        ))}
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Gender
          <select value={form.gender || ''} onChange={e => set('gender', e.target.value)} className="input mt-1.5">
            <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Date of birth
          <input type="date" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} className="input mt-1.5" />
        </label>
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Blood group
          <select value={form.blood_group || ''} onChange={e => set('blood_group', e.target.value)} className="input mt-1.5">
            <option value="">Select</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>

        {parentFields.map(([name, label]) => (
          <label key={name} className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}
            <input value={form[name] || ''} onChange={e => set(name, e.target.value)} className="input mt-1.5" />
          </label>
        ))}

        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Class
          <select required value={form.class_id || ''} onChange={e => setForm(f => ({ ...f, class_id: e.target.value, section_id: '' }))} className="input mt-1.5">
            <option value="" disabled>Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Section
          <select required value={form.section_id || ''} onChange={e => set('section_id', e.target.value)} className="input mt-1.5" disabled={!form.class_id}>
            <option value="" disabled>{form.class_id ? 'Select section' : 'Select a class first'}</option>{sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Status
          <select value={form.status} onChange={e => set('status', e.target.value)} className="input mt-1.5">
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="graduated">Graduated</option>
          </select>
        </label>
      </div>

      <button type="button" onClick={() => setShowGov(v => !v)} className="mt-5 text-sm font-semibold text-brand">
        {showGov ? '− Hide' : '+ Add'} government identity fields (PEN, APAAR, Aadhaar)
      </button>
      {showGov && (
        <div className="mt-3 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3 dark:bg-slate-800/50">
          {govFields.map(([name, label]) => (
            <label key={name} className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}
              <input value={form[name] || ''} onChange={e => set(name, e.target.value)} className="input mt-1.5" placeholder={name === 'aadhaar_number' ? '12-digit number' : ''} maxLength={name === 'aadhaar_number' ? 12 : undefined} />
            </label>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button className="btn-primary">Save student</button>
      </div>
    </form>
  )
}
