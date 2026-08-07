import { useState } from 'react'
import { Bot, FileCode2, Loader2, ShieldAlert, Sparkles } from 'lucide-react'
import { investigateTicket, markAiFailed, markAiInvestigating } from '../services/supportTickets'

export default function TicketAIPanel({ ticket, onUpdated }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!ticket || busy) return
    setBusy(true); setError('')
    try {
      await markAiInvestigating(ticket.id)
      const updated = await investigateTicket(ticket)
      onUpdated(updated)
    } catch (e) {
      const message = e?.message || 'AI investigation failed.'
      try { await markAiFailed(ticket.id, message) } catch {}
      setError(message)
      onUpdated({ ...ticket, ai_status: 'failed', ai_error: message })
    } finally { setBusy(false) }
  }

  const running = busy || ticket.ai_status === 'investigating'

  return (
    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm"><Bot size={20} /></span><div><p className="text-sm font-black text-violet-950 dark:text-violet-100">AI Investigation</p><p className="mt-0.5 text-[11px] text-violet-700 dark:text-violet-300">Analyzes the ticket and relevant Skylark source files. It does not change production code.</p></div></div>
        <button onClick={run} disabled={running} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-60">{running ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{running ? 'Investigating…' : ticket.ai_status === 'completed' ? 'Run Again' : 'Investigate with AI'}</button>
      </div>

      {running && <div className="mt-4 grid gap-2 sm:grid-cols-4"><span className="rounded-lg bg-white/80 p-2 text-center text-[10px] font-bold text-violet-700 dark:bg-slate-900/70">✓ Ticket context</span><span className="rounded-lg bg-white/80 p-2 text-center text-[10px] font-bold text-violet-700 dark:bg-slate-900/70">✓ GitHub files</span><span className="rounded-lg bg-white/80 p-2 text-center text-[10px] font-bold text-violet-700 dark:bg-slate-900/70">✓ Code analysis</span><span className="rounded-lg bg-white/80 p-2 text-center text-[10px] font-bold text-violet-700 dark:bg-slate-900/70">◌ Root cause</span></div>}

      {ticket.ai_status === 'completed' && <div className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase text-slate-400">Confidence</p><p className="mt-1 text-lg font-black text-violet-700">{ticket.ai_confidence ?? 0}%</p></div><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase text-slate-400">AI Priority</p><p className="mt-1 text-sm font-black capitalize">{ticket.ai_priority || '—'}</p></div><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase text-slate-400">Risk</p><p className="mt-1 flex items-center gap-1 text-sm font-black capitalize"><ShieldAlert size={14} />{ticket.ai_risk_level || '—'}</p></div></div><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase text-slate-400">Summary</p><p className="mt-1 text-sm leading-6">{ticket.ai_summary || 'No summary returned.'}</p></div><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase text-slate-400">Likely Root Cause</p><p className="mt-1 text-sm leading-6">{ticket.ai_root_cause || 'No root cause returned.'}</p></div><div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase text-slate-400">Recommended Fix / Next Checks</p><p className="mt-1 whitespace-pre-line text-sm leading-6">{ticket.ai_recommendation || 'No recommendation returned.'}</p></div>{Array.isArray(ticket.ai_affected_files) && ticket.ai_affected_files.length > 0 && <div className="rounded-xl bg-white p-3 dark:bg-slate-900"><p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400"><FileCode2 size={13} /> Affected Files</p><div className="mt-2 flex flex-wrap gap-1.5">{ticket.ai_affected_files.map(file => <span key={file} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] dark:bg-slate-800">{file}</span>)}</div></div>}</div>}
      {ticket.ai_status === 'failed' && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error || ticket.ai_error || 'AI investigation failed.'}</p>}
    </div>
  )
}
