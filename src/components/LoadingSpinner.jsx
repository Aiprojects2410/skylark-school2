export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f8fc]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  )
}
