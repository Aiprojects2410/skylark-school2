import { useState } from 'react'
import PhotoUpload from './PhotoUpload'
const fields = [['qualification', 'Qualification'], ['phone', 'Phone'], ['email', 'Email']]

export default function TeacherForm({ teacher = {}, onSave, onCancel }) {
  const [form, setForm] = useState({ ...teacher })
  const submit = e => { e.preventDefault(); onSave(form) }
  return (
    <form onSubmit={submit} className="p-5">
      <PhotoUpload value={form.photo_url} onChange={url => setForm({ ...form, photo_url: url })} folder="teachers" />

      {form.employee_id && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-brand dark:bg-blue-950/30">Employee ID: {form.employee_id}</p>}
      {!form.id && <p className="mt-4 text-xs text-slate-400">An Employee ID is generated automatically once saved. A login can be created afterwards.</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">Full name
          <input required value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input mt-1.5" />
        </label>
        {fields.map(([name, label]) => (
          <label key={name} className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {label}
            <input required={name === 'email'} value={form[name] || ''} onChange={e => setForm({ ...form, [name]: e.target.value })} className="input mt-1.5" />
          </label>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button className="btn-primary">Save teacher</button>
      </div>
    </form>
  )
}
