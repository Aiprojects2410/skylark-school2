import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import BrandFooter from '../components/BrandFooter'

export default function ChangePassword({ forced = false }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const notify = useToast()
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) return notify("Passwords don't match.")
    if (password.length < 8) return notify('Password must be at least 8 characters.')
    setBusy(true)
    try {
      // Clears the must_change_password flag set at account creation, and sets the real password —
      // Supabase Auth handles hashing; the plain password is never stored anywhere by our code.
      const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } })
      if (error) throw error
      notify('Password updated.')
      navigate('/', { replace: true })
    } catch (e) { notify(e.message) } finally { setBusy(false) }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fc] p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white"><KeyRound /></div>
        <h1 className="mt-6 text-2xl font-bold text-ink">{forced ? 'Set a new password' : 'Change password'}</h1>
        <p className="mt-2 text-sm text-slate-500">{forced ? 'For security, you must set your own password before continuing.' : 'Choose a new password for your account.'}</p>

        <label className="mt-6 block text-sm font-medium">New password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input mt-1.5" /></label>
        <label className="mt-4 block text-sm font-medium">Confirm password<input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="input mt-1.5" /></label>

        <button disabled={busy} className="btn-primary mt-6 w-full justify-center disabled:opacity-60">{busy ? 'Saving…' : 'Set password'}</button>
      </form>
      <BrandFooter />
    </main>
  )
}
