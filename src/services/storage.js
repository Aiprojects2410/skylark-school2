import { supabase } from '../lib/supabase'

const BUCKET = 'school-photos'

export async function uploadPhoto(file, folder = 'misc') {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!file) throw new Error('No file selected.')

  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const safeFolder = String(folder || 'misc').replace(/[^a-zA-Z0-9_-]/g, '-')
  const path = `${safeFolder}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Could not create photo URL.')
  return data.publicUrl
}
