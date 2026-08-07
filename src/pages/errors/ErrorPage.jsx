import { Link } from 'react-router-dom'
import BrandFooter from '../../components/BrandFooter'

export default function ErrorPage({ code, title, text, icon: Icon }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f6f8fc] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-card">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
          {Icon ? <Icon size={30} /> : <span className="text-2xl font-black">{code}</span>}
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-wide text-brand">Error {code}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{text}</p>
        <Link to="/" className="btn-primary mt-7 inline-flex justify-center">Back to dashboard</Link>
      </div>
      <BrandFooter />
    </main>
  )
}
