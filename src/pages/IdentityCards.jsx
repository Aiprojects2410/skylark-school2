import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { GraduationCap, Printer, RefreshCw, Download, CheckSquare, Square, RotateCcw } from 'lucide-react'
import { PageHeader, Badge } from '../components/ui'
import { getStudents, setStudentCardPrinted } from '../services/students'
import { getTeachers, setTeacherCardPrinted } from '../services/teachers'
import { regenerateQrToken } from '../services/identity'
import { useToast } from '../context/ToastContext'

function IdCard({ name, code, role, meta, qrDataUrl, photoUrl, printMode }) {
  const isBw = printMode === 'bw'
  return (
    <div className={`id-card ${isBw ? 'id-card-bw' : ''}`}>
      <div className="id-card-header">
        <GraduationCap size={20} />
        <div className="id-card-header-copy">
          <p>SKYLARK SCHOOL</p>
          <span>{role.toUpperCase()} IDENTITY CARD</span>
        </div>
      </div>

      <div className="id-card-top">
        <div className="id-card-photo">
          {photoUrl ? <img src={photoUrl} alt="" crossOrigin="anonymous" className={isBw ? 'grayscale' : ''} /> : name.split(' ').map(x => x[0]).slice(0, 2).join('')}
        </div>
        <div className="id-card-qr">
          {qrDataUrl ? <img src={qrDataUrl} alt="QR code" /> : <span>QR</span>}
        </div>
      </div>

      <div className="id-card-details">
        <p className="id-card-name">{name}</p>
        <p className="id-card-code">{role === 'student' ? 'School ID: ' : 'Employee ID: '}{code}</p>
        {meta && <p className="id-card-meta">{meta}</p>}
      </div>

      <div className="id-card-footer">Valid for academic year 2026–27 · skylarkschool.edu</div>
    </div>
  )
}

export default function IdentityCards() {
  const [tab, setTab] = useState('students')
  const [view, setView] = useState('remaining')
  const [printMode, setPrintMode] = useState('color')
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [qrMap, setQrMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [exporting, setExporting] = useState(false)
  const notify = useToast()
  const gridRef = useRef(null)
  const hiddenNodesRef = useRef([])

  useEffect(() => {
    Promise.all([getStudents(), getTeachers()])
      .then(([s, t]) => { setStudents(s); setTeachers(t) })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const items = tab === 'students' ? students : teachers
    items.forEach(item => {
      const token = item.qr_token
      if (!token || qrMap[token]) return
      QRCode.toDataURL(token, {
        margin: 0,
        width: 256,
        color: { dark: '#172033', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).then(url => setQrMap(m => ({ ...m, [token]: url }))).catch(() => {})
    })
  }, [tab, students, teachers])

  const allItems = tab === 'students' ? students : teachers
  const remainingItems = useMemo(() => allItems.filter(i => !i.card_printed_at), [allItems])
  const displayedItems = view === 'remaining' ? remainingItems : allItems

  useEffect(() => {
    if (view === 'remaining') setSelected(new Set(remainingItems.map(i => i.id)))
    else setSelected(new Set())
  }, [view, tab, remainingItems.length])

  function toggleSelected(id) {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function selectAll() { setSelected(new Set(remainingItems.map(i => i.id))) }
  function selectNone() { setSelected(new Set()) }

  function hideUnselected() {
    const nodes = gridRef.current?.querySelectorAll('[data-card-item]') || []
    hiddenNodesRef.current = []
    nodes.forEach(node => {
      if (!selected.has(node.getAttribute('data-card-item'))) {
        node.style.display = 'none'
        hiddenNodesRef.current.push(node)
      }
    })
  }
  function restoreHidden() {
    hiddenNodesRef.current.forEach(node => { node.style.display = '' })
    hiddenNodesRef.current = []
  }

  async function markSelectedPrinted() {
    const ids = [...selected]
    if (ids.length === 0) return
    try {
      if (tab === 'students') {
        await Promise.all(ids.map(id => setStudentCardPrinted(id, true)))
        setStudents(v => v.map(s => selected.has(s.id) ? { ...s, card_printed_at: new Date().toISOString() } : s))
      } else {
        await Promise.all(ids.map(id => setTeacherCardPrinted(id, true)))
        setTeachers(v => v.map(t => selected.has(t.id) ? { ...t, card_printed_at: new Date().toISOString() } : t))
      }
    } catch (e) { notify(e.message) }
  }

  async function sendBackToQueue(item) {
    try {
      if (tab === 'students') {
        await setStudentCardPrinted(item.id, false)
        setStudents(v => v.map(s => s.id === item.id ? { ...s, card_printed_at: null } : s))
      } else {
        await setTeacherCardPrinted(item.id, false)
        setTeachers(v => v.map(t => t.id === item.id ? { ...t, card_printed_at: null } : t))
      }
      notify('Moved back to the remaining cards queue.')
    } catch (e) { notify(e.message) }
  }

  function handlePrint() {
    if (view === 'remaining' && selected.size === 0) return notify('Select at least one card to print.')
    if (view === 'remaining') hideUnselected()
    const after = () => {
      window.removeEventListener('afterprint', after)
      if (view === 'remaining') { restoreHidden(); markSelectedPrinted() }
    }
    window.addEventListener('afterprint', after)
    window.print()
  }

  async function handleDownloadPdf() {
    if (view === 'remaining' && selected.size === 0) return notify('Select at least one card to export.')
    setExporting(true)
    try {
      const nodes = [...(gridRef.current?.querySelectorAll('[data-card-item]') || [])]
        .filter(node => view === 'all' || selected.has(node.getAttribute('data-card-item')))
      if (nodes.length === 0) throw new Error('No cards selected for export.')

      await document.fonts?.ready
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const columns = 2
      const rows = 2
      const marginX = 12
      const marginY = 12
      const gapX = 8
      const gapY = 10
      const cardWidth = Math.min(88, (pageWidth - marginX * 2 - gapX) / columns)
      const cardHeight = Math.min(118, (pageHeight - marginY * 2 - gapY) / rows)

      for (let index = 0; index < nodes.length; index += 1) {
        const slot = index % (columns * rows)
        if (index > 0 && slot === 0) pdf.addPage()
        const card = nodes[index].querySelector('.id-card')
        const canvas = await html2canvas(card, {
          scale: 3,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: false,
          imageTimeout: 15000,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 600,
          windowHeight: 900,
        })
        const ratio = Math.min(cardWidth / canvas.width, cardHeight / canvas.height)
        const w = canvas.width * ratio
        const h = canvas.height * ratio
        const col = slot % columns
        const row = Math.floor(slot / columns)
        const x = marginX + col * (cardWidth + gapX) + (cardWidth - w) / 2
        const y = marginY + row * (cardHeight + gapY) + (cardHeight - h) / 2
        pdf.addImage(canvas.toDataURL('JPEG', 0.96), 'JPEG', x, y, w, h, undefined, 'FAST')
      }

      pdf.save(`${tab}-id-cards-${printMode}-${new Date().toISOString().slice(0, 10)}.pdf`)
      if (view === 'remaining') await markSelectedPrinted()
      notify('PDF downloaded.')
    } catch (e) {
      notify(e.message || 'Could not generate PDF.')
    } finally {
      setExporting(false)
      restoreHidden()
    }
  }

  return (
    <>
      <PageHeader eyebrow="IDENTITY" title="Identity & QR Cards" subtitle="Generate professional printable ID cards with embedded QR codes."
        action={<div className="flex flex-wrap gap-2 print:hidden"><button onClick={handleDownloadPdf} disabled={exporting} className="btn-secondary disabled:opacity-60"><Download size={16} /> {exporting ? 'Preparing…' : 'Download PDF'}</button><button onClick={handlePrint} className="btn-primary"><Printer size={16} /> Print cards</button></div>} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-2"><button onClick={() => setTab('students')} className={`btn-secondary ${tab === 'students' ? 'bg-brand text-white' : ''}`}>Students</button><button onClick={() => setTab('teachers')} className={`btn-secondary ${tab === 'teachers' ? 'bg-brand text-white' : ''}`}>Teachers</button></div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-400">QR / Card style</span><button onClick={() => setPrintMode('color')} className={`btn-secondary ${printMode === 'color' ? 'bg-brand text-white' : ''}`}>Color</button><button onClick={() => setPrintMode('bw')} className={`btn-secondary ${printMode === 'bw' ? 'bg-slate-900 text-white' : ''}`}>Black & White</button></div>
        <div className="flex gap-2"><button onClick={() => setView('remaining')} className={`btn-secondary ${view === 'remaining' ? 'bg-brand text-white' : ''}`}>Remaining cards <Badge tone={view === 'remaining' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}>{remainingItems.length}</Badge></button><button onClick={() => setView('all')} className={`btn-secondary ${view === 'all' ? 'bg-brand text-white' : ''}`}>All cards</button></div>
      </div>

      {view === 'remaining' && !loading && remainingItems.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm print:hidden"><span className="text-slate-500">{selected.size} of {remainingItems.length} selected</span><button onClick={selectAll} className="font-semibold text-brand hover:underline">Select all</button><button onClick={selectNone} className="font-semibold text-slate-500 hover:underline">Select none</button></div>}

      {loading ? <p className="text-sm text-slate-400">Loading…</p> : view === 'remaining' && remainingItems.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">No new {tab === 'students' ? 'students' : 'teachers'} waiting on a card — everyone already has a printed card. Switch to "All cards" to reprint one.</p> : (
        <div className="id-card-grid" ref={gridRef}>
          {displayedItems.map(item => {
            const printed = Boolean(item.card_printed_at)
            const isChecked = selected.has(item.id)
            return <div key={item.id} data-card-item={item.id}>
              <IdCard name={item.full_name} code={tab === 'students' ? item.student_id : item.employee_id} role={tab === 'students' ? 'student' : 'teacher'} meta={tab === 'students' ? `${item.class_name || ''} ${item.section_name || ''}`.trim() : item.qualification} qrDataUrl={qrMap[item.qr_token]} photoUrl={item.photo_url} printMode={printMode} />
              <div className="mt-2 flex items-center justify-between print:hidden"><div className="flex items-center gap-3">
                {view === 'remaining' ? <button onClick={() => toggleSelected(item.id)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">{isChecked ? <CheckSquare size={15} className="text-brand" /> : <Square size={15} />} Select</button> : <Badge tone={printed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{printed ? 'Printed' : 'Not printed'}</Badge>}
                <button onClick={async () => { try { const newToken = await regenerateQrToken(tab === 'students' ? 'students' : 'teachers', item.id); if (tab === 'students') setStudents(v => v.map(x => x.id === item.id ? { ...x, qr_token: newToken } : x)); else setTeachers(v => v.map(x => x.id === item.id ? { ...x, qr_token: newToken } : x)); notify('QR code regenerated — the old card is now invalid.') } catch (e) { notify(e.message) } }} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand"><RefreshCw size={13} /> Regenerate QR</button>
              </div>{view === 'all' && printed && <button onClick={() => sendBackToQueue(item)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand" title="Move back to the remaining cards queue for reprinting"><RotateCcw size={13} /> Reprint</button>}</div>
            </div>
          })}
        </div>
      )}
    </>
  )
}
