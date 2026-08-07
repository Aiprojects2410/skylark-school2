import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, LockKeyhole, UserCircle2 } from 'lucide-react'
import { hasSupabase, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLE_HOME } from '../routes/RoleProtectedRoute'
import BrandFooter from '../components/BrandFooter'

const looksLikeEmail = (v) => /\S+@\S+\.\S+/.test(v)

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { isAuthenticated, role, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Already signed in? Send them straight to their dashboard.
  if (!loading && isAuthenticated) {
    const from = location.state?.from?.pathname
    return <Navigate to={from || (role ? ROLE_HOME[role] || '/dashboard/admin' : '/')} replace />
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!hasSupabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')

      let email = identifier.trim()
      // Not an email? Treat it as a School ID (e.g. SKY-STU-2026-0001) and resolve it server-side.
      if (!looksLikeEmail(email)) {
        const { data, error: rpcError } = await supabase.rpc('resolve_school_id_to_email', { school_id_text: email })
        if (rpcError) throw rpcError
        if (!data) throw new Error('We could not find an account with that School ID.')
        email = data
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fc] p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white"><GraduationCap /></div>
        <p className="mt-7 text-sm font-semibold text-brand">SKYLARK SCHOOL ERP</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with your email or School ID.</p>

        <label className="mt-7 block text-sm font-medium">
          Email or School ID
          <span className="relative mt-1.5 block">
            <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="input pl-10"
              placeholder="name@school.edu or SKY-STU-2026-0001"
              autoComplete="username"
              required
            />
          </span>
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input mt-1.5" autoComplete="current-password" required />
        </label>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <button disabled={busy} className="btn-primary mt-6 w-full justify-center disabled:opacity-60">
          <LockKeyhole size={16} />{busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-5 text-center text-xs text-slate-400">Roles: Super Admin · Admin · Principal · Teacher · Student</p>
      </form>
      <BrandFooter />
    </main>
  )
}
