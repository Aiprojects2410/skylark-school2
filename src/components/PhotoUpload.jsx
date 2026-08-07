import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadPhoto } from '../services/storage'

export default function PhotoUpload({ value, onChange, folder = 'misc' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const url = await uploadPhoto(file, folder)
      onChange(url)
    } catch (err) {
      setError('Upload failed. Please try a smaller image.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-4">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {busy ? <Loader2 className="animate-spin text-slate-400" size={20} /> : value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Camera className="text-slate-400" size={20} />}
      </span>
      <span>
        <span className="btn-secondary text-xs">{value ? 'Change photo' : 'Upload photo'}</span>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </span>
    </label>
  )
}
