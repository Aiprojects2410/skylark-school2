import { useState } from 'react'
import { PageHeader } from '../components/ui'
import TeacherForm from '../components/TeacherForm'
import Modal from '../components/Modal'

export default function Teachers() {
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [teachers, setTeachers] = useState([
    { id: '1', employee_id: 'EMP-2001', full_name: 'Dr. Ramesh Gupta', qualification: 'Ph.D Mathematics', phone: '9876543220', email: 'ramesh@skylark.edu' },
    { id: '2', employee_id: 'EMP-2002', full_name: 'Sunita Mehra', qualification: 'M.Sc Physics', phone: '9876543221', email: 'sunita@skylark.edu' }
  ])

  const handleSave = (data) => {
    if (data.id) {
      setTeachers(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t))
    } else {
      const newTeacher = { ...data, id: String(Date.now()), employee_id: `EMP-${Math.floor(2000 + Math.random() * 8000)}` }
      setTeachers(prev => [...prev, newTeacher])
    }
    setShowModal(false)
    setEditingTeacher(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="FACULTY"
        title="Teacher Directory"
        subtitle="Manage teaching staff profiles, qualifications, and contacts."
        action={
          <button className="btn-primary" onClick={() => { setEditingTeacher(null); setShowModal(true) }}>
            + Add New Teacher
          </button>
        }
      />

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Qualification</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id}>
                <td className="font-semibold text-brand">{t.employee_id}</td>
                <td className="font-medium text-ink dark:text-white">{t.full_name}</td>
                <td>{t.qualification || '—'}</td>
                <td>{t.phone || '—'}</td>
                <td>{t.email || '—'}</td>
                <td>
                  <button className="text-xs font-semibold text-brand hover:underline" onClick={() => { setEditingTeacher(t); setShowModal(true) }}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'} onClose={() => setShowModal(false)}>
          <TeacherForm teacher={editingTeacher || {}} onSave={handleSave} onCancel={() => setShowModal(false)} />
        </Modal>
      )}
    </>
  )
}
