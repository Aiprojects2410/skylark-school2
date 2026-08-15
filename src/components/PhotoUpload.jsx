import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadPhoto } from '../services/storage'

const MAX_DIMENSION = 400
const MAX_FILE_SIZE = 1024 * 1024 // 1 MB
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function preparePhoto(file) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Please select a JPG, PNG, or WebP image.')

  // Keep already-small JPEG/WebP images as-is. PNG is also preserved when it is already within the limit.
  if (file.size <= MAX_FILE_SIZE) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  let width = Math.max(1, Math.round(bitmap.width * scale))
  let height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    throw new Error('Could not process the image.')
  }

  // Re-encode as JPEG and lower quality/dimensions only as much as needed to stay below 1 MB.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const quality = Math.max(0.5, 0.82 - attempt * 0.07)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) break

    if (blob.size <= MAX_FILE_SIZE) {
      bitmap.close?.()
      return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
    }

    width = Math.max(160, Math.round(width * 0.8))
    height = Math.max(160, Math.round(height * 0.8))
  }

  bitmap.close?.()
  throw new Error('The image could not be compressed below the 1 MB limit.')
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
      setError(err?.message || 'Upload failed. Please try again.')
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
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
      </span>
    </label>
  )
}
