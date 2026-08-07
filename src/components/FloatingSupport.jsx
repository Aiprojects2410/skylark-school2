import { useEffect, useMemo, useState } from 'react'
import html2canvas from 'html2canvas'
import { Bug, CheckCircle2, ChevronRight, Clock3, ImagePlus, Lightbulb, Loader2, MessageCircle, Send, Ticket, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { createTicket, listMyTickets } from '../services/supportTickets'

const ACTIONS = [
  { key: 'bug', label: 'Report a bug', description: 'Something is not working correctly.', icon: Bug, category: 'bug' },
  { key: 'feature', label: 'Suggest a feature', description: 'Request an improvement or new feature.', icon: Lightbulb, category: 'feature' },
  { key: 'help', label: 'Get help', description: 'Ask about using the ERP.', icon: MessageCircle, category: 'technical' },
  { key: 'data', label: 'Report data issue', description: 'Wrong, missing or unexpected data.', icon: Ticket, category: 'data' },
]

function statusTone(status) {
  if (status === 'resolved' || status === 'closed') return 'bg-emerald-50 text-emerald-700'
  if (status === 'in_progress') return 'bg-amber-50 text-amber-700'
  return 'bg-blue-50 text-blue-700'
}

function similarity(a, b) {
  const words = value => new Set(String(value || '').toLowerCase().match(/[a-z0-9]{4,}/g) || [])
  const left = words(a)
  const right = words(b)
  if (!left.size || !right.size) return 0
  let common = 0
  left.forEach(word => { if (right.has(word)) common += 1 })
  return common / Math.max(left.size, right.size)
}

export default function FloatingSupport() {
  const { isAuthenticated } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('home')
  const [action, setAction] = useState(null)
  const [tickets, setTickets] = useState([])
  const [screenshot, setScreenshot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [duplicates, setDuplicates] = useState([])
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' })

  const activeCount = useMemo(() => tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length, [tickets])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    const timer = window.setTimeout(() => setExpanded(false), 2800)
    return () => window.clearTimeout(timer)
  }, [isAuthenticated])

  async function refreshTickets() {
    if (!hasSupabase) return
    try { setTickets(await listMyTickets()) } catch {}
  }

  async function openCenter() {
    setExpanded(true)
    setOpen(true)
    setView('home')
    setCreated(null)
    setError('')
    await refreshTickets()
  }

  function closeCenter() {
    setOpen(false)
    setView('home')
    setAction(null)
    setTimeout(() => setExpanded(false), 250)
  }

  async function startAction(item) {
    setAction(item)
    setView('report')
    setCreated(null)
    setError('')
    setDuplicates([])
    setBusy(true)
    try {
      const canvas = await html2canvas(document.body, { useCORS: true, backgroundColor: getComputedStyle(document.body).backgroundColor || '#fff', scale: Math.min(window.devicePixelRatio || 1, 1.5), logging: false })
      canvas.toBlob(blob => {
        setScreenshot(blob ? new File([blob], 'issue-screenshot.jpg', { type: 'image/jpeg' }) : null)
        setBusy(false)
      }, 'image/jpeg', 0.82)
    } catch {
      setScreenshot(null)
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.description.trim()) { setError('Please describe the issue first.'); return }
    setBusy(true); setError('')
    try {
      const recent = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).slice(0, 12)
      const matches = recent.filter(t => similarity(`${form.subject} ${form.description}`, `${t.subject} ${t.description}`) >= 0.38).slice(0, 3)
      setDuplicates(matches)
      const ticket = await createTicket({ subject: form.subject, description: form.description, category: action.category, priority: form.priority, pagePath: window.location.pathname, screenshot })
      setCreated(ticket)
      setForm({ subject: '', description: '', priority: 'medium' })
      await refreshTickets()
    } catch (e) {
      setError(e?.message || 'Could not create the ticket.')
    } finally { setBusy(false) }
  }

  if (!isAuthenticated) return null

  return (
    <>
      <div className={`fixed right-2 top-1/2 z-[70] -translate-y-1/2 transition-all duration-500 sm:right-5 ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <button type="button" onMouseEnter={() => setExpanded(true)} onFocus={() => setExpanded(true)} onClick={openCenter} aria-label="Open Support Center" className={`relative flex h-12 items-center gap-2 overflow-hidden rounded-l-2xl rounded-r-md border border-slate-200 bg-white pl-2 pr-2 shadow-[0_10px_35px_rgba(15,23,42,.18)] transition-all duration-500 hover:-translate-x-1 dark:border-slate-700 dark:bg-slate-900 ${expanded ? 'w-[122px]' : 'w-12'}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand text-white"><Ticket size={17} strokeWidth={2.3} /></span>
          <span className={`whitespace-nowrap text-xs font-extrabold text-slate-700 transition-opacity dark:text-white ${expanded ? 'opacity-100' : 'opacity-0'}`}>Support</span>
          {activeCount > 0 && <span className="absolute -left-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{activeCount}</span>}
        </button>
      </div>

      <div className={`fixed right-2 top-1/2 z-[80] w-[min(390px,calc(100vw-16px))] -translate-y-1/2 transition-all duration-300 sm:right-5 ${open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[110%] opacity-0'}`}>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,.24)] dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white"><Ticket size={16} /></span><div><p className="text-sm font-black text-slate-900 dark:text-white">Support Center</p><p className="text-[10px] text-slate-500">Report, track and get help</p></div></div>
            <button onClick={closeCenter} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
          </header>

          <div className="max-h-[min(70vh,620px)] overflow-y-auto p-3">
            {view === 'home' && <>
              <div className="grid gap-2">
                {ACTIONS.map(item => { const Icon = item.icon; return <button key={item.key} onClick={() => startAction(item)} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-brand/20 hover:bg-brand/5 dark:border-slate-800 dark:bg-slate-800/60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm dark:bg-slate-900"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800 dark:text-white">{item.label}</span><span className="block text-[11px] text-slate-500">{item.description}</span></span><ChevronRight size={16} className="text-slate-300 group-hover:text-brand" /></button> })}
              </div>
              <div className="mt-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black text-slate-800 dark:text-white">My tickets</p><span className="text-[10px] font-bold text-slate-400">{activeCount} active</span></div>{tickets.length ? <div className="space-y-2">{tickets.slice(0, 5).map(t => <div key={t.id} className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800"><div className="flex items-center gap-2"><Ticket size={13} className="text-brand" /><p className="min-w-0 flex-1 truncate text-xs font-bold">#{t.ticket_number} · {t.subject}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${statusTone(t.status)}`}>{String(t.status || '').replace('_', ' ')}</span></div>{t.ai_status === 'completed' && <p className="mt-1 pl-5 text-[10px] font-semibold text-violet-600">🤖 AI investigated</p>}</div>)}</div> : <div className="rounded-lg bg-slate-50 px-3 py-4 text-center dark:bg-slate-800/50"><Clock3 size={16} className="mx-auto mb-1 text-slate-300" /><p className="text-[11px] text-slate-400">No recent tickets</p></div>}</div>
            </>}

            {view === 'report' && <>
              <button onClick={() => { setView('home'); setAction(null) }} className="mb-3 text-xs font-black text-brand">← Back</button>
              {created ? <div className="py-5 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={30} /></div><h3 className="mt-3 text-lg font-black">Ticket created</h3><p className="mt-1 text-xs text-slate-500">Your issue is now in the support queue.</p><div className="mx-auto mt-4 max-w-xs rounded-xl bg-slate-100 px-4 py-3 text-lg font-black tracking-wide text-brand dark:bg-slate-800">#{created.ticket_number}</div>{duplicates.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800"><p className="font-black">Similar tickets found</p>{duplicates.map(t => <p key={t.id} className="mt-1">#{t.ticket_number} · {t.subject}</p>)}</div>}<button onClick={() => { setView('home'); setAction(null) }} className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white">Done</button></div> : <form onSubmit={submit} className="space-y-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><div className="flex gap-2"><ImagePlus size={16} /><span>Current screen will be captured automatically for troubleshooting.</span></div></div>
                {screenshot && <img src={URL.createObjectURL(screenshot)} alt="Current screen" className="max-h-32 w-full rounded-xl border object-cover object-top" />}
                <label className="block text-xs font-bold">Subject<input value={form.subject} onChange={e => setForm(v => ({ ...v, subject: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="Short summary" /></label>
                <label className="block text-xs font-bold">What went wrong? <span className="text-rose-500">*</span><textarea required value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="Explain the issue or error…" /></label>
                <label className="block text-xs font-bold">Priority<select value={form.priority} onChange={e => setForm(v => ({ ...v, priority: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-950"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                {error && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Ticket</button>
              </form>}
            </>}
          </div>
        </section>
      </div>
    </>
  )
}
