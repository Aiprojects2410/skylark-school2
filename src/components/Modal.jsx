export default function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/40"
      role="dialog" aria-modal="true"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex min-h-full items-start justify-center p-4 py-8">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Close">×</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
