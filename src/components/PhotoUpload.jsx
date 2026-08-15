import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadPhoto } from '../services/storage'

const MAX_DIMENSION = 400
const MAX_FILE_SIZE = 1024 * 1024 // 1 MB

async function preparePhoto(file) {
  if (!file.type?.startsWith('image/')) throw new Error('Please select an image file.')

  // Keep already-small images as-is.
  if (file.size <= MAX_FILE_SIZE && /jpe?g|webp|png/i.test(file.type)) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.82)
  })
  if (!blob) throw new Error('Could not compress the image.')

  return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
}

export default function PhotoUpload({ value, onChange, folder = 'misc' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const prepared = await preparePhoto(file)
      const url = await uploadPhoto(prepared, folder)
      onChange(url)
    } catch (err) {
      console.error('Photo upload failed:', err)
      setError(err?.message || 'Upload failed. Please try a smaller image.')
    } finally {
      setBusy(false)
      e.target.value = ''
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
        <input type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={handleFile} className="hidden" />
      </span>
    </label>
  )
}
