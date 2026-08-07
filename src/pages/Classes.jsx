import { useEffect, useState } from 'react'
import { PageHeader, Badge } from '../components/ui'
import { getClasses } from '../services/classes'
import { useToast } from '../context/ToastContext'

export default function Classes() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const notify = useToast()

  useEffect(() => { getClasses().then(setClasses).catch(e => notify(e.message)).finally(() => setLoading(false)) }, [])

  return (
    <>
      <PageHeader eyebrow="ACADEMICS" title="Classes & sections" subtitle="Organize grades, sections and class teachers." />
      {loading ? <p className="text-sm text-slate-400">Loading classes…</p> : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map(c => (
            <article className="card" key={c.id}>
              <p className="text-lg font-bold text-ink dark:text-white">{c.name}{c.section ? ` • ${c.section}` : ''}</p>
              <p className="mt-2 text-sm text-slate-500">Class teacher: {c.teacher || 'Unassigned'}</p>
              {c.sections?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.sections.map(s => <Badge key={s.id}>{s.name}</Badge>)}
                </div>
              )}
              <div className="mt-5 flex items-center justify-between">
                <Badge>{c.students ?? '—'} students</Badge>
                <button className="text-sm font-semibold text-brand">Manage</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
