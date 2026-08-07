import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { PageHeader } from '../components/ui'
import CredentialsModal from '../components/CredentialsModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { updateOwnProfile, resetAnyPassword } from '../services/account'

const STAFF = ['super_admin', 'admin', 'principal']

export default function SettingsPage() {
  const { profile, role } = useAuth()
  const notify = useToast()
  const [name, setName] = useState(profile?.full_name || '')
  const [savingName, setSavingName] = useState(false)

  const [lookup, setLookup] = useState('')
  const [resetting, setResetting] = useState(false)
  const [credentials, setCredentials] = useState(null)

  async function saveName(e) {
    e.preventDefault()
    setSavingName(true)
    try {
      await updateOwnProfile(profile.id, { full_name: name })
      notify('Name updated.')
    } catch (err) { notify(err.message) } finally { setSavingName(false) }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!lookup.trim()) return
    setResetting(true)
    try {
      const creds = await resetAnyPassword(lookup.trim())
      setCredentials(creds)
      setLookup('')
    } catch (err) { notify(err.message) } finally { setResetting(false) }
  }

  return (
    <>
      <PageHeader eyebrow="CONFIGURATION" title="Settings" subtitle="Brand and account settings." />

      <section className="card max-w-3xl">
        <h2 className="section-title">Your account</h2>
        <form onSubmit={saveName} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Full name<input className="input mt-1.5" value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="text-sm font-medium">School ID<input className="input mt-1.5" defaultValue={profile?.login_code || ''} disabled /></label>
          <label className="text-sm font-medium">Email<input className="input mt-1.5" defaultValue={profile?.email || ''} disabled /></label>
          <label className="text-sm font-medium">Role<input className="input mt-1.5 capitalize" defaultValue={(role || '').replace('_', ' ')} disabled /></label>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button disabled={savingName} className="btn-primary disabled:opacity-60">{savingName ? 'Saving…' : 'Save name'}</button>
            <Link to="/change-password" className="btn-secondary">Change password</Link>
          </div>
        </form>
      </section>

      {STAFF.includes(role) && (
        <section className="card mt-6 max-w-3xl">
          <div className="flex items-center gap-3"><KeyRound className="text-brand" size={20} /><h2 className="section-title">Reset anyone's password</h2></div>
          <p className="section-subtitle">Search by School ID or email — works for students, teachers, and other admins. No extra permission needed; a new temporary password is generated instantly and the account must set its own password on next login.</p>
          <form onSubmit={handleResetPassword} className="mt-4 flex flex-wrap gap-2">
            <input
              value={lookup}
              onChange={e => setLookup(e.target.value)}
              className="input flex-1 min-w-[240px]"
              placeholder="School ID (e.g. SKY-ADM-2026-0001) or email"
            />
            <button disabled={resetting} className="btn-primary disabled:opacity-60">{resetting ? 'Resetting…' : 'Reset password'}</button>
          </form>
        </section>
      )}

      <section className="card mt-6 max-w-3xl">
        <h2 className="section-title">School profile</h2>
        <p className="section-subtitle">Brand and general organization settings.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">School name<input className="input mt-1.5" defaultValue="Skylark School" /></label>
          <label className="text-sm font-medium">School email<input className="input mt-1.5" defaultValue="hello@skylarkschool.edu" /></label>
          <label className="text-sm font-medium">Academic year<input className="input mt-1.5" defaultValue="2026–2027" /></label>
          <label className="text-sm font-medium">Theme
            <select className="input mt-1.5"><option>System default</option><option>Light</option><option>Dark</option></select>
          </label>
        </div>
        <button onClick={() => notify('Settings saved.')} className="btn-primary mt-6">Save changes</button>
      </section>

      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onClose={() => setCredentials(null)}
          title={`Password reset — ${credentials.full_name}`}
        />
      )}
    </>
  )
}
