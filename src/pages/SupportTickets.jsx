import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, MessageSquare, RefreshCw, Search, Ticket, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { addTicketMessage, listAllTickets, listTicketMessages, updateTicket } from '../services/supportTickets'

const STATUS = ['open', 'in_progress', 'resolved', 'closed']

function Badge({ children, tone = 'slate' }) {
  const tones = { slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone] || tones.slate}`}>{children}</span>
}

export default function SupportTickets() {
  const { role } = useAuth()
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [status, setStatus] = useState('open')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allowed = ['super_admin', 'admin', 'principal'].includes(role)

  async function load() {
    if (!hasSupabase || !allowed) { setLoading(false); return }
    setLoading(true); setError('')
    try { setTickets(await listAllTickets()) } catch (e) { setError(e?.message || 'Could not load tickets.') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [role])

  async function openTicket(ticket) {
    setSelected(ticket); setStatus(ticket.status); setReply('')
    try { setMessages(await listTicketMessages(ticket.id)) } catch (e) { setError(e?.message || 'Could not load conversation.') }
  }

  async function saveStatus() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      const updated = await updateTicket(selected.id, { status })
      setSelected(v => ({ ...v, ...updated }))
      setTickets(v => v.map(t => t.id === selected.id ? { ...t, ...updated } : t))
    } catch (e) { setError(e?.message || 'Could not update ticket.') } finally { setSaving(false) }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return
    setSaving(true); setError('')
    try {
      const msg = await addTicketMessage(selected.id, reply.trim())
      setMessages(v => [...v, msg]); setReply('')
    } catch (e) { setError(e?.message || 'Could not send reply.') } finally { setSaving(false) }
  }

  const filtered = useMemo(() => tickets.filter(t => {
    const q = search.toLowerCase()
    return !q || [t.ticket_number, t.subject, t.description, t.profiles?.full_name, t.profiles?.email].some(x => String(x || '').toLowerCase().includes(q))
  }), [tickets, search])

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    high: tickets.filter(t => t.priority === 'high' && !['resolved', 'closed'].includes(t.status)).length,
  }), [tickets])

  if (!allowed) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">You do not have permission to view support tickets.</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-sm font-semibold text-brand">Administration</p><h1 className="text-2xl font-black text-slate-900 dark:text-white">Support Tickets</h1><p className="mt-1 text-sm text-slate-500">Review, respond to and resolve issues reported from any portal.</p></div>
        <button onClick={load} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[[Ticket, 'Total', stats.total, 'slate'], [AlertCircle, 'Open', stats.open, 'blue'], [Clock3, 'In Progress', stats.progress, 'amber'], [CheckCircle2, 'Resolved', stats.resolved, 'green'], [XCircle, 'High Priority', stats.high, 'red']].map(([Icon, label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon size={17} /></div><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p><Badge tone={tone}>{label}</Badge></div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 sm:w-80 dark:bg-slate-800"><Search size={16} className="text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket, user or issue..." className="w-full bg-transparent text-sm outline-none" /></div>
          <span className="text-xs text-slate-500">{filtered.length} ticket{filtered.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading tickets…</div> : filtered.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No tickets found.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(t => <tr key={t.id} onClick={() => openTicket(t)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"><td className="px-4 py-3 font-black text-brand">#{t.ticket_number}</td><td className="px-4 py-3"><p className="font-semibold">{t.profiles?.full_name || 'User'}</p><p className="text-xs text-slate-400 capitalize">{t.profiles?.role || ''}</p></td><td className="max-w-xs px-4 py-3"><p className="truncate font-semibold">{t.subject || 'Issue reported'}</p><p className="truncate text-xs text-slate-400">{t.description}</p></td><td className="px-4 py-3"><Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'slate'}>{t.priority}</Badge></td><td className="px-4 py-3"><Badge tone={t.status === 'open' ? 'blue' : t.status === 'in_progress' ? 'amber' : 'green'}>{t.status.replace('_', ' ')}</Badge></td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td></tr>)}
          </tbody></table></div>
        )}
      </div>

      {selected && <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/50 p-0 sm:p-4"><div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-brand">#{selected.ticket_number}</p><h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{selected.subject || 'Reported Issue'}</h2><p className="mt-1 text-xs text-slate-500">{new Date(selected.created_at).toLocaleString()} · {selected.page_path}</p></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><XCircle size={20} /></button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] text-slate-400">Reported by</p><p className="mt-1 font-bold">{selected.profiles?.full_name || 'User'}</p><p className="text-xs text-slate-500">{selected.profiles?.email || ''}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] text-slate-400">Category</p><p className="mt-1 font-bold capitalize">{selected.category}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] text-slate-400">Priority</p><p className="mt-1 font-bold capitalize">{selected.priority}</p></div></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-800"><p className="mb-2 text-xs font-bold uppercase text-slate-400">Issue Description</p>{selected.description}</div>
        {selected.screenshot_path && <a href="#" onClick={async e => { e.preventDefault(); const { data } = await (await import('../lib/supabase')).supabase.storage.from('support-attachments').createSignedUrl(selected.screenshot_path, 300); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer') }} className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-brand dark:border-slate-700">View Screenshot</a>}
        <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="text-sm font-semibold">Status<select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">{STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></label><button disabled={saving} onClick={saveStatus} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Save Status</button></div></div>
        <div className="mt-6"><div className="flex items-center gap-2 text-sm font-bold"><MessageSquare size={17} /> Conversation</div><div className="mt-3 space-y-2">{messages.length === 0 ? <p className="text-sm text-slate-400">No replies yet.</p> : messages.map(m => <div key={m.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><p>{m.message}</p><p className="mt-1 text-[11px] text-slate-400">{m.sender_role || 'user'} · {new Date(m.created_at).toLocaleString()}</p></div>)}</div><div className="mt-3 flex gap-2"><textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Reply to the user..." className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" /><button disabled={saving || !reply.trim()} onClick={sendReply} className="self-end rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Reply</button></div></div>
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </div></div>}
    </div>
  )
}
