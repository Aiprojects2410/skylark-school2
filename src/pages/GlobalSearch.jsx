import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function GlobalSearch() {
  const { profile, role } = useAuth()
  const [q,setQ] = useState('')
  const [results,setResults] = useState([])
  const [loading,setLoading] = useState(false)
  useEffect(()=>{
    const timer=setTimeout(async()=>{
      const term=q.trim()
      if(term.length<2){setResults([]);return}
      setLoading(true)
      if(role==='student'){
        const {data}=await supabase.from('students').select('id,student_id,full_name,email,status').eq('auth_user_id',profile?.id).or(`student_id.ilike.%${term}%,full_name.ilike.%${term}%`).limit(20)
        setResults((data||[]).map(x=>({...x,type:'My Student Record',code:x.student_id})))
      } else {
        const [s,t,p]=await Promise.all([
          supabase.from('students').select('id,student_id,full_name,email,status').or(`student_id.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(20),
          supabase.from('teachers').select('id,employee_id,full_name,email').or(`employee_id.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(20),
          supabase.from('profiles').select('id,login_code,full_name,email,role').or(`login_code.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(20)
        ])
        setResults([...(s.data||[]).map(x=>({...x,type:'Student',code:x.student_id})),...(t.data||[]).map(x=>({...x,type:'Teacher',code:x.employee_id})),...(p.data||[]).map(x=>({...x,type:`${x.role} account`,code:x.login_code}))])
      }
      setLoading(false)
    },250)
    return ()=>clearTimeout(timer)
  },[q,role,profile?.id])
  return <><PageHeader eyebrow="SEARCH" title="Global Search" subtitle="Search records you are permitted to see across the ERP."/><section className="card"><label className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800"><Search size={20}/><input autoFocus className="w-full bg-transparent outline-none" placeholder="Student ID, teacher ID, name or email…" value={q} onChange={e=>setQ(e.target.value)}/></label><div className="mt-5">{loading?<p className="text-sm text-slate-400">Searching…</p>:results.length?<div className="space-y-2">{results.map((r,i)=><div key={`${r.id}-${i}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800"><div><b>{r.full_name||r.login_code}</b><p className="text-xs text-slate-400">{r.type} · {r.code||r.email||''}</p></div><span className="text-xs capitalize text-slate-400">{r.status||r.role||''}</span></div>)}</div>:q.length>=2?<p className="text-sm text-slate-400">No permitted records found.</p>:<p className="text-sm text-slate-400">Type at least 2 characters to search.</p>}</div></section></>
}
