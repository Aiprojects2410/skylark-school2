import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState('')
  const notify = useCallback((message) => {
    setToast(message)
    window.clearTimeout(notify._t)
    notify._t = window.setTimeout(() => setToast(''), 2800)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && <div className="fixed bottom-5 right-5 z-[60] rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
