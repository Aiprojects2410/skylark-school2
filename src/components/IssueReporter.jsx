import { useState } from 'react'
import html2canvas from 'html2canvas'
import { Camera, CheckCircle2, ImagePlus, Loader2, Send, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import { createTicket } from '../services/supportTickets'

const CATEGORIES = [
  ['technical', 'Technical Issue'],
  ['bug', 'Bug / Error'],
  ['feature', 'Feature Request'],
  ['data', 'Data Issue'],
  ['other', 'Other'],
]

export default function IssueReporter() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [screenshot, setScreenshot] = useState(null)
  const [form, setForm] = useState({ subject: '', description: '', category: 'technical', priority: 'medium' })

  if (!isAuthenticated) return null

  async function openReporter() {
    setError('')
    setTicket(null)
    setBusy(true)
    try {
      if (!hasSupabase) {
        setOpen(true)
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
        setBusy(false)
      }, 'image/jpeg', 0.82)
    } catch {
      setScreenshot(null)
      setOpen(true)
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.description.trim()) { setError('Please explain what went wrong.'); return }
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
      <button
        type="button"
        onClick={openReporter}
        disabled={busy && !open}
        title="Report an issue"
        aria-label="Report an issue"
        className="fixed bottom-6 right-6 z-[70] grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-2xl ring-4 ring-white/70 transition hover:scale-105 hover:bg-brand/90 disabled:opacity-70 dark:ring-slate-950/70"
      >
        {busy && !open ? <Loader2 className="animate-spin" size={22} /> : <Camera size={23} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Report an Issue</h2>
                <p className="text-xs text-slate-500">We captured this screen to help the admin understand the problem.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
            </div>

            {ticket ? (
              <div className="p-7 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><CheckCircle2 size={30} /></div>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Ticket Created</h3>
                <p className="mt-2 text-sm text-slate-500">Your issue has been sent to the administrator.</p>
                <div className="mx-auto mt-5 max-w-xs rounded-xl bg-slate-100 px-4 py-3 text-lg font-black tracking-wide text-brand dark:bg-slate-800">#{ticket.ticket_number}</div>
                <button onClick={() => setOpen(false)} className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 p-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <div className="flex gap-2"><ImagePlus size={16} className="mt-0.5 shrink-0" /><span>A screenshot of the current page will be attached automatically.</span></div>
                </div>

                {screenshot && <img src={URL.createObjectURL(screenshot)} alt="Current screen preview" className="max-h-40 w-full rounded-xl border border-slate-200 object-cover object-top dark:border-slate-700" />}

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">What went wrong? <span className="text-rose-500">*</span>
                  <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={5} required placeholder="Explain the issue, error message, or what you expected to happen..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category
                    <select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                      {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Priority
                    <select value={form.priority} onChange={e => setForm(v => ({ ...v, priority: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Subject <span className="font-normal text-slate-400">(optional)</span>
                  <input value={form.subject} onChange={e => setForm(v => ({ ...v, subject: e.target.value }))} placeholder="Short summary" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950" />
                </label>

                {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={17} />} Submit Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
