import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, GraduationCap, Keyboard, QrCode, ScanLine, XCircle } from 'lucide-react'
import { useQrCamera } from '../hooks/useQrCamera'
import { verifyAndMarkAttendance } from '../services/identity'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import BrandFooter from '../components/BrandFooter'

const RESULT_COPY = {
  marked_present: { icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50', text: 'Attendance marked present' },
  already_marked: { icon: CheckCircle2, tone: 'text-amber-600 bg-amber-50', text: 'Already marked today' },
  not_found: { icon: XCircle, tone: 'text-rose-600 bg-rose-50', text: 'QR code not recognized' },
}

export default function Scanner() {
  const [manualCode, setManualCode] = useState('')
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const processingRef = useRef(new Set())
  const notify = useToast()
  const { profile } = useAuth()

  async function handleCode(token) {
    // Different cards may be scanned back-to-back. Only suppress the same token
    // while its request is still in flight.
    if (processingRef.current.has(token)) return
    processingRef.current.add(token)
    setBusy(true)
    try {
      const outcome = await verifyAndMarkAttendance(token, profile?.id)
      setLog(l => [{ token, ...outcome, at: new Date() }, ...l].slice(0, 50))
    } catch (e) {
      notify(e.message)
    } finally {
      processingRef.current.delete(token)
      setBusy(processingRef.current.size > 0)
    }
  }

  const { videoRef, cameraOn, error, start, stop } = useQrCamera(handleCode)

  function submitManual(e) {
    e.preventDefault()
    if (manualCode.trim()) {
      handleCode(manualCode.trim())
      setManualCode('')
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><GraduationCap size={18} /></span>
        <div><p className="text-sm font-bold text-ink">Skylark Scanner</p><p className="text-xs text-slate-400">Continuous attendance scanner</p></div>
        <Link to="/" className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft size={16} /> Back to dashboard</Link>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6">
          <p className="eyebrow">ATTENDANCE</p>
          <h1 className="page-title">QR Scanner</h1>
          <p className="section-subtitle">Start the camera once, then scan every teacher or student card without turning it off.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Camera scan</h2>
                {cameraOn && <p className="mt-1 text-xs font-medium text-emerald-600">Camera is live · scan the next card</p>}
              </div>
              {!cameraOn ? (
                <button onClick={start} className="btn-primary"><ScanLine size={16} /> Start camera</button>
              ) : (
                <button onClick={stop} className="btn-secondary">Stop</button>
              )}
            </div>
            <div className="mt-4 grid aspect-video place-items-center overflow-hidden rounded-2xl bg-slate-900">
              <video ref={videoRef} className={`h-full w-full object-cover ${cameraOn ? '' : 'hidden'}`} muted playsInline />
              {!cameraOn && <QrCode className="text-slate-500" size={48} />}
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <form onSubmit={submitManual} className="mt-6 flex items-end gap-3 border-t pt-5 dark:border-slate-800">
              <label className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                Manual entry (QR token)
                <span className="relative mt-1.5 block">
                  <Keyboard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input value={manualCode} onChange={e => setManualCode(e.target.value)} className="input pl-9" placeholder="Paste the QR token for testing" />
                </span>
              </label>
              <button className="btn-primary" disabled={busy}>Log</button>
            </form>
          </section>

          <section className="card">
            <h2 className="section-title">Scan log</h2>
            <p className="section-subtitle">Most recent scans this session</p>
            <div className="mt-4 space-y-2">
              {log.length === 0 && <p className="text-sm text-slate-400">No scans yet.</p>}
              {log.map((entry, i) => {
                const copy = RESULT_COPY[entry.result] || RESULT_COPY.not_found
                const Icon = copy.icon
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-xl p-3 ${copy.tone}`}>
                    <Icon size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{entry.name || 'Unknown code'}</p>
                      <p className="text-xs opacity-80">{copy.text} · {entry.at.toLocaleTimeString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
      <BrandFooter />
    </div>
  )
}
