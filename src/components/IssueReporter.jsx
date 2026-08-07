import { useEffect, useState } from 'react'
import html2canvas from 'html2canvas'
import { Bug, CheckCircle2, ChevronRight, ImagePlus, Lightbulb, Loader2, MessageCircle, Send, Ticket, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { createTicket, listMyTickets } from '../services/supportTickets'

const ACTIONS = [
  ['bug', 'Report a bug', Bug, 'Something is not working correctly.'],
  ['feature', 'Suggest a feature', Lightbulb, 'Request an improvement or new feature.'],
  ['technical', 'Get help', MessageCircle, 'Need help using the ERP?'],
]

const CATEGORIES = [
  ['technical', 'Technical Issue'],
  ['bug', 'Bug / Error'],
  ['feature', 'Feature Request'],
  ['data', 'Data Issue'],
  ['other', 'Other'],
]

const STATUS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export default function IssueReporter() {
  const { isAuthenticated } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [tickets, setTickets] = useState([])
  const [screenshot, setScreenshot] = useState(null)
  const [form, setForm] = useState({ subject: '', description: '', category: 'technical', priority: 'medium' })

  useEffect(() => {
    const timer = window.setTimeout(() => setExpanded(false), 2800)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open || !hasSupabase) return
    listMyTickets().then(setTickets).catch(() => setTickets([]))
  }, [open, ticket])

  if (!isAuthenticated) return null

  async function openReporter(category = null) {
    setError('')
    setTicket(null)
    setBusy(true)
    if (category) setForm(v => ({ ...v, category }))
    try {
      if (!hasSupabase) {
        setOpen(true)
        setExpanded(true)
        setBusy(false)
        return
      }
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
        scale: Math.min(window.devicePixelRatio || 1, 1.5),
        logging: false,
      })
      canvas.toBlob((blob) => {
        setScreenshot(blob ? new File([blob], 'issue-screenshot.jpg', { type: 'image/jpeg' }) : null)
        setOpen(true)
        setExpanded(true)
        setBusy(false)
      }, 'image/jpeg', 0.82)
    } catch {
      setScreenshot(null)
      setOpen(true)
      setExpanded(true)
      setBusy(false)
    }
  }

  function closeReporter() {
    setOpen(false)
    setTicket(null)
    setExpanded(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.description.trim()) {
      setError('Please explain what went wrong.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await createTicket({ ...form, pagePath: window.location.pathname, screenshot })
      setTicket(created)
      setForm({ subject: '', description: '', category: 'technical', priority: 'medium' })
    } catch (err) {
      setError(err?.message || 'Could not create the ticket.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <div className="fixed right-3 top-1/2 z-[70] -translate-y-1/2 sm:right-5">
          <button
            type="button"
            onMouseEnter={() => setExpanded(true)}
            onFocus={() => setExpanded(true)}
            onClick={() => openReporter()}
            disabled={busy}
            aria-label="Open Support Center"
            title="Support Center"
            className={`group relative flex h-12 items-center gap-2 overflow-hidden rounded-l-2xl rounded-r-md border border-slate-200 bg-white pl-3 pr-2 shadow-[0_10px_35px_rgba(15,23,42,0.16)] transition-all duration-500 hover:-translate-x-1 hover:shadow-[0_14px_42px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900 ${expanded ? 'w-[122px]' : 'w-12'}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Ticket size={17} strokeWidth={2.3} />}
            </span>
            <span className={`whitespace-nowrap text-xs font-extrabold text-slate-700 transition-opacity duration-200 dark:text-slate-100 ${expanded ? 'opacity-100' : 'opacity-0'}`}>Support</span>
            {tickets.some(t => ['open', 'in_progress'].includes(t.status)) && <span className="absolute -left-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length}</span>}
          </button>
        </div>
      )}

      <div className={`fixed right-3 top-1/2 z-[80] w-[min(390px,calc(100vw-24px))] -translate-y-1/2 sm:right-5 ${open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[110%] opacity-0'} transition-all duration-300 ease-out`}>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><Ticket size={17} /></span>
              <div><h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Support Center</h2><p className="text-[10px] text-slate-500">Report and track ERP issues</p></div>
            </div>
            <button type="button" onClick={closeReporter} aria-label="Close support center" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><X size={18} /></button>
          </div>

          <div className="max-h-[min(72vh,600px)] overflow-y-auto p-3">
            {ticket ? (
              <div className="p-5 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><CheckCircle2 size={30} /></div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Ticket Created</h3>
                <p className="mt-1 text-xs text-slate-500">Your issue has been sent to the administrator.</p>
                <div className="mx-auto mt-4 max-w-xs rounded-xl bg-slate-100 px-4 py-3 text-base font-black tracking-wide text-brand dark:bg-slate-800">#{ticket.ticket_number}</div>
                <button type="button" onClick={closeReporter} className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white">Done</button>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  {ACTIONS.map(([category, label, Icon, description]) => (
                    <button key={category} type="button" onClick={() => openReporter(category)} disabled={busy} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-brand/20 hover:bg-brand/5 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm dark:bg-slate-900"><Icon size={17} /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800 dark:text-white">{label}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400">{description}</span></span>
                      <ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                    </button>
                  ))}
                </div>

                <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                <form onSubmit={submit} className="space-y-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                    <div className="flex gap-2"><ImagePlus size={15} className="mt-0.5 shrink-0" /><span>The current page is captured automatically so the admin can see the context.</span></div>
                  </div>

                  {screenshot && <img src={URL.createObjectURL(screenshot)} alt="Current screen preview" className="max-h-32 w-full rounded-xl border border-slate-200 object-cover object-top dark:border-slate-700" />}

                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">What went wrong? <span className="text-rose-500">*</span>
                    <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={4} required placeholder="Explain the issue, error message, or expected result..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950" />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Category
                      <select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal dark:border-slate-700 dark:bg-slate-950">{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    </label>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Priority
                      <select value={form.priority} onChange={e => setForm(v => ({ ...v, priority: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal dark:border-slate-700 dark:bg-slate-950"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                    </label>
                  </div>

                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Subject <span className="font-normal text-slate-400">(optional)</span>
                    <input value={form.subject} onChange={e => setForm(v => ({ ...v, subject: e.target.value }))} placeholder="Short summary" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950" />
                  </label>

                  {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

                  <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white shadow-sm disabled:opacity-60">
                    {busy ? <Loader2 className="animate-spin" size={17} /> : <Send size={16} />} Submit Ticket
                  </button>
                </form>

                {tickets.length > 0 && (
                  <div className="mt-4 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="mb-2 flex items-center justify-between"><p className="text-xs font-extrabold text-slate-800 dark:text-white">Recent tickets</p><span className="text-[10px] text-slate-400">{tickets.length}</span></div>
                    <div className="space-y-1.5">{tickets.slice(0, 4).map(t => <div key={t.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60"><Ticket size={13} className="shrink-0 text-brand" /><span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{t.ticket_number} · {t.subject}</span><span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">{STATUS[t.status] || t.status}</span></div>)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
