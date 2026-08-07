import { useEffect, useState } from 'react'
import { CalendarCheck, CircleDollarSign, ClipboardList, Receipt } from 'lucide-react'
import { Badge, PageHeader, Stat } from '../components/ui'
import Modal from '../components/Modal'
import { getInvoices } from '../services/fees'
import { useToast } from '../context/ToastContext'

export default function Fees() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState(null)
  const notify = useToast()

  useEffect(() => { getInvoices().then(setInvoices).catch(e => notify(e.message)).finally(() => setLoading(false)) }, [])

  const totalAmount = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const outstanding = totalAmount - paidAmount
  const fmt = n => `₹${(n / 1000).toFixed(1)}K`

  return (
    <>
      <PageHeader eyebrow="FINANCE" title="Fees management" subtitle="Track dues, payments and receipt-ready records." />
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Expected collection" value={fmt(totalAmount)} icon={CircleDollarSign} tone="bg-blue-50 text-brand" note="This academic year" />
        <Stat label="Collected" value={fmt(paidAmount)} icon={CalendarCheck} tone="bg-emerald-50 text-emerald-600" note={totalAmount ? `${Math.round((paidAmount / totalAmount) * 100)}% collection rate` : ''} />
        <Stat label="Outstanding" value={fmt(outstanding)} icon={ClipboardList} tone="bg-rose-50 text-rose-600" note="Follow up required" />
      </section>

      <section className="card mt-6">
        <h2 className="section-title">Recent payments</h2>
        <div className="mt-4 overflow-x-auto">
          <table>
            <thead><tr><th>Receipt / Invoice</th><th>Student</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="p-8 text-center">Loading…</td></tr> : invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.receipt || inv.id}</td>
                  <td>{inv.student_name || inv.students?.full_name}</td>
                  <td>₹{Number(inv.amount || inv.total_amount).toLocaleString('en-IN')}</td>
                  <td><Badge tone={inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{inv.status}</Badge></td>
                  <td className="text-right"><button onClick={() => setReceipt(inv)} className="text-sm font-semibold text-brand">View receipt</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {receipt && (
        <Modal title="Payment receipt" onClose={() => setReceipt(null)}>
          <div className="p-5">
            <div className="flex items-center gap-3 border-b pb-4 dark:border-slate-800"><Receipt className="text-brand" /><div><p className="font-bold text-ink dark:text-white">{receipt.receipt || receipt.id}</p><p className="text-xs text-slate-500">{receipt.payment_date || '—'}</p></div></div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Student</dt><dd className="font-medium">{receipt.student_name || receipt.students?.full_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-medium">₹{Number(receipt.amount || receipt.total_amount).toLocaleString('en-IN')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><Badge>{receipt.status}</Badge></dd></div>
            </dl>
          </div>
        </Modal>
      )}
    </>
  )
}
