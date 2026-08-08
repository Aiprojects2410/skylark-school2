import { useEffect, useState } from 'react'
import { LogOut, ShieldCheck, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function SecurityCenter() {
  const { profile, session } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('erp_security_events').select('event_type,user_agent,metadata,created_at').eq('user_id', profile?.id).order('created_at', { ascending: false }).limit(30)
    setEvents(data || [])
    setMessage(error?.message || '')
    setLoading(false)
  }
  useEffect(() => { if (profile?.id) load() }, [profile?.id])
  async function revokeOthers() {
    setMessage('')
    const { data, error } = await supabase.functions.invoke('super-admin-account-control', { body: { action: 'revoke_sessions', user_id: profile?.id } })
    if (error || data?.error) setMessage(error?.message || data?.error || 'Unable to revoke sessions.')
    else setMessage('Other sessions were signed out.')
    load()
  }
  return <>
    <PageHeader eyebrow="SECURITY" title="Login Activity & Security" subtitle="Review your recent login activity and protect your account." action={<button className="btn-secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>} />
    {message && <div className="mb-5 rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">{message}</div>}
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="card lg:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="section-title">Recent activity</h2><p className="section-subtitle">Only activity belonging to this account is shown.</p></div><ShieldCheck className="text-brand"/></div>{loading ? <p className="text-sm text-slate-400">Loading activity…</p> : events.length ? <div className="space-y-3">{events.map((e,i)=><div key={`${e.created_at}-${i}`} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"><div className="flex justify-between gap-3"><b className="capitalize">{String(e.event_type).replaceAll('_',' ')}</b><span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</span></div><p className="mt-1 text-xs text-slate-400">{e.user_agent || 'Browser session'}</p></div>)}</div> : <p className="text-sm text-slate-400">No recent security events recorded yet.</p>}</section>
      <section className="card"><h2 className="section-title">Current account</h2><p className="section-subtitle mb-4">{profile?.full_name} · {profile?.role}</p><div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">Your current authenticated session is active.</div><button className="btn-primary mt-4 w-full" onClick={revokeOthers}><LogOut size={16}/> Sign out other sessions</button></section>
    </div>
  </>
}
