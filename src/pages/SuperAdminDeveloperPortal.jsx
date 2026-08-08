import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Users, UserPlus, Lock, Unlock, Save, RefreshCw, Settings2 } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ROLES = ['super_admin', 'admin', 'principal', 'teacher', 'student', 'parent']
const PERMISSIONS = [
  ['dashboard.view','Dashboard'],['students.view','Students: View'],['students.manage','Students: Manage'],
  ['teachers.view','Teachers: View'],['teachers.manage','Teachers: Manage'],['attendance.view','Attendance: View'],
  ['attendance.manage','Attendance: Manage'],['classes.manage','Classes & Subjects'],['timetable.manage','Timetable'],
  ['homework.manage','Homework'],['fees.manage','Fees & Accounts'],['notices.manage','Notice Board'],['leave.manage','Leave'],
  ['reports.view','Reports'],['identity.manage','Identity & QR'],['settings.manage','ERP Settings'],
  ['support.manage','Support / Tickets'],['users.manage','User Management'],['accounts.create','Create Login IDs'],
  ['accounts.revoke','Revoke Login IDs'],['permissions.manage','Manage Permissions'],['system.manage','System Controls'],
]

export default function SuperAdminDeveloperPortal() {
  const { role, profile } = useAuth()
  const [tab,setTab] = useState('accounts')
  const [profiles,setProfiles] = useState([])
  const [permissions,setPermissions] = useState([])
  const [settings,setSettings] = useState({})
  const [selectedRole,setSelectedRole] = useState('admin')
  const [form,setForm] = useState({full_name:'',login_code:'',email:'',phone:'',role:'admin'})
  const [message,setMessage] = useState('')
  const [saving,setSaving] = useState(false)

  const load = async () => {
    const [p,r,s] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,role,phone,login_code,created_at').order('created_at',{ascending:false}),
      supabase.from('erp_role_permissions').select('role,permission_key,allowed'),
      supabase.from('erp_system_settings').select('key,value'),
    ])
    setProfiles(p.data || []); setPermissions(r.data || []); setSettings(Object.fromEntries((s.data||[]).map(x=>[x.key,x.value])))
    if (p.error || r.error || s.error) setMessage((p.error||r.error||s.error).message)
  }
  useEffect(()=>{ if(role==='super_admin') load() },[role])

  const allowed = useMemo(()=>new Set(permissions.filter(x=>x.role===selectedRole && x.allowed).map(x=>x.permission_key)),[permissions,selectedRole])
  const toggle = key => setPermissions(prev=>{
    const i=prev.findIndex(x=>x.role===selectedRole && x.permission_key===key)
    if(i>=0){const a=[...prev];a[i]={...a[i],allowed:!a[i].allowed};return a}
    return [...prev,{role:selectedRole,permission_key:key,allowed:true}]
  })
  const savePermissions = async () => {
    setSaving(true); const rows=PERMISSIONS.map(([permission_key])=>({role:selectedRole,permission_key,allowed:allowed.has(permission_key),updated_by:profile?.id}))
    const {error}=await supabase.from('erp_role_permissions').upsert(rows,{onConflict:'role,permission_key'})
    setSaving(false); setMessage(error?.message || `${selectedRole.replace('_',' ')} permissions saved.`); if(!error) load()
  }
  const createAccount = async e => {
    e.preventDefault(); setSaving(true); setMessage('')
    const {data,error}=await supabase.functions.invoke('super-admin-account-control',{body:{action:'create',...form,allow_super_admin_creator:profile?.id}})
    setSaving(false); if(error||data?.error){setMessage(error?.message||data?.error||'Account creation failed');return}
    setMessage(`Account created. Temporary password: ${data?.temp_password || 'shown by the function'}`); setForm({...form,full_name:'',login_code:'',email:'',phone:''}); load()
  }
  const accountAction = async (action,id) => {
    setSaving(true); const {data,error}=await supabase.functions.invoke('super-admin-account-control',{body:{action,user_id:id,allow_super_admin_creator:profile?.id}}); setSaving(false)
    setMessage(error?.message || data?.error || (action==='revoke'?'Login revoked.':action==='restore'?'Login restored.':'Password reset.')); load()
  }
  const saveSettings = async () => {
    setSaving(true); const rows=Object.entries(settings).map(([key,value])=>({key,value,updated_by:profile?.id,updated_at:new Date().toISOString()})); const {error}=await supabase.from('erp_system_settings').upsert(rows,{onConflict:'key'}); setSaving(false); setMessage(error?.message || 'Runtime settings saved. No deploy required.');
  }
  if(role!=='super_admin') return null

  return <>
    <PageHeader eyebrow="DEVELOPER PORTAL" title="Super Admin Developer Portal" subtitle="Central control for accounts, permissions and runtime ERP settings. These controls are stored in Supabase." action={<button className="btn-secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>} />
    <div className="grid gap-4 sm:grid-cols-3 mb-6"><div className="card"><ShieldCheck className="text-brand"/><p className="mt-2 text-xs text-slate-400">ACCESS</p><b>Developer / Super Admin</b></div><div className="card"><Users className="text-violet-600"/><p className="mt-2 text-xs text-slate-400">ACCOUNTS</p><b>{profiles.length}</b></div><div className="card"><Settings2 className="text-amber-600"/><p className="mt-2 text-xs text-slate-400">ROLES</p><b>{ROLES.length}</b></div></div>
    <div className="mb-5 flex flex-wrap gap-2">{[['accounts','Account Center'],['permissions','Permissions'],['settings','Runtime Settings']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tab===id?'bg-brand text-white':'bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200'}`}>{label}</button>)}</div>
    {message && <div className="mb-5 rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">{message}</div>}
    {tab==='accounts' && <div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
      <section className="card"><h2 className="section-title">Create Login ID</h2><p className="section-subtitle mb-4">Create Admin, Principal, Teacher, Student, Parent or Super Admin accounts.</p><form onSubmit={createAccount} className="space-y-3"><input className="input w-full" placeholder="Full name" required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><input className="input w-full" placeholder="Login ID" required value={form.login_code} onChange={e=>setForm({...form,login_code:e.target.value})}/><input className="input w-full" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input className="input w-full" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><select className="input w-full" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}</select><button className="btn-primary w-full" disabled={saving}><UserPlus size={16}/>{saving?'Working…':'Create Login ID'}</button></form></section>
      <section className="card"><h2 className="section-title">All Login IDs</h2><p className="section-subtitle mb-4">Super Admin can revoke, restore and reset non-Super-Admin accounts.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="px-3 py-3">User</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{profiles.map(p=><tr key={p.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-3"><b>{p.full_name||'Unnamed'}</b><div className="text-xs text-slate-400">{p.email||'No email'}</div></td><td className="px-3 py-3 capitalize">{String(p.role).replace('_',' ')}</td><td className="px-3 py-3">{p.login_code||'—'}</td><td className="px-3 py-3">{p.role==='super_admin'?<span className="text-xs text-slate-400">Protected</span>:<div className="flex gap-2"><button className="btn-secondary" onClick={()=>accountAction('revoke',p.id)}><Lock size={14}/>Revoke</button><button className="btn-secondary" onClick={()=>accountAction('restore',p.id)}><Unlock size={14}/>Restore</button></div>}</td></tr>)}</tbody></table></div></section>
    </div>}
    {tab==='permissions' && <section className="card"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="section-title">Permission Matrix</h2><p className="section-subtitle">Super Admin controls which rights each role receives.</p></div><div className="flex gap-2"><select className="input" value={selectedRole} onChange={e=>setSelectedRole(e.target.value)}>{ROLES.map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}</select><button className="btn-primary" onClick={savePermissions} disabled={saving}><Save size={16}/>Save</button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PERMISSIONS.map(([key,label])=>{const on=allowed.has(key);return <button key={key} onClick={()=>toggle(key)} className={`flex items-center justify-between rounded-xl border p-4 text-left ${on?'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20':'border-slate-200 dark:border-slate-800'}`}><span><b className="block text-sm">{label}</b><span className="text-xs text-slate-400">{key}</span></span><ShieldCheck size={18} className={on?'text-emerald-600':'text-slate-300'}/></button>})}</div></section>}
    {tab==='settings' && <section className="card"><h2 className="section-title">Runtime ERP Settings</h2><p className="section-subtitle mb-5">Operational settings can be changed here without a code deploy.</p><div className="grid gap-4 md:grid-cols-2"><label className="rounded-xl border p-4 dark:border-slate-800"><b>Student portal read-only</b><select className="input mt-3 w-full" value={String(settings.student_portal_read_only ?? true)} onChange={e=>setSettings({...settings,student_portal_read_only:e.target.value==='true'})}><option value="true">Enabled</option><option value="false">Disabled</option></select></label><label className="rounded-xl border p-4 dark:border-slate-800"><b>Maintenance mode</b><select className="input mt-3 w-full" value={String(settings.maintenance_mode ?? false)} onChange={e=>setSettings({...settings,maintenance_mode:e.target.value==='true'})}><option value="false">Disabled</option><option value="true">Enabled</option></select></label></div><button className="btn-primary mt-5" onClick={saveSettings} disabled={saving}><Save size={16}/>Save Settings</button></section>}
  </>
}
