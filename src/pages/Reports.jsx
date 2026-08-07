import { CalendarCheck, CircleDollarSign, GraduationCap } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useToast } from '../context/ToastContext'

const REPORTS = [
  ['Student report', GraduationCap, 'Enrollment, demographics and class data'],
  ['Attendance report', CalendarCheck, 'Date-wise and class-wise attendance'],
  ['Fee report', CircleDollarSign, 'Collections, outstanding balances and receipts'],
]

export default function Reports() {
  const notify = useToast()
  return (
    <>
      <PageHeader eyebrow="INSIGHTS" title="Reports" subtitle="Exportable information for decisions and compliance." />
      <div className="grid gap-5 md:grid-cols-3">
        {REPORTS.map(([t, I, d]) => (
          <article className="card" key={t}>
            <I className="text-brand" />
            <h2 className="mt-5 text-lg font-bold text-ink dark:text-white">{t}</h2>
            <p className="mt-2 text-sm text-slate-500">{d}</p>
            <button onClick={() => notify(`${t} export will be available once reporting is wired up to live data.`)} className="btn-secondary mt-5 w-full">Generate report</button>
          </article>
        ))}
      </div>
    </>
  )
}
