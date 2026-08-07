export function Avatar({ name }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 font-bold text-brand">{(name || '?').split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
}

export function Stat({ label, value, icon: Icon, tone, note }) {
  return (
    <article className="card">
      <div className="flex items-start justify-between">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-ink dark:text-white">{value}</p></div>
        <span className={`rounded-xl p-3 ${tone}`}><Icon size={20} /></span>
      </div>
      {note && <p className="mt-4 text-xs text-slate-500">{note}</p>}
    </article>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
