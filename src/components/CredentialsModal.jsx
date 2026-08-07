import { Copy, Download, Printer } from 'lucide-react'
import Modal from './Modal'

export default function CredentialsModal({ credentials, onClose, title = 'Student login created' }) {
  const text = `Skylark School — Login\n\nUsername: ${credentials.username}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.temp_password}\n\nPlease change your password after first login.`

  return (
    <Modal title={title} onClose={onClose}>
      <div className="p-5">
        <p className="text-sm text-slate-500">Save these now — the password won't be shown again. The student must change it on first login.</p>
        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
          <div className="flex justify-between"><dt className="text-slate-500">Username</dt><dd className="font-mono font-semibold">{credentials.username}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-mono font-semibold">{credentials.email}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Temporary password</dt><dd className="font-mono font-semibold">{credentials.temp_password}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => navigator.clipboard.writeText(text)} className="btn-secondary"><Copy size={15} /> Copy</button>
          <button onClick={() => window.print()} className="btn-secondary"><Printer size={15} /> Print</button>
          <button onClick={() => { const blob = new Blob([text], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${credentials.username}-login.txt`; a.click() }} className="btn-secondary"><Download size={15} /> Download</button>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full justify-center">Done</button>
      </div>
    </Modal>
  )
}
