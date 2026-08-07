import { supabase } from '../lib/supabase'

export async function verifyAndMarkAttendance(token, markedBy) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('verify_and_mark_attendance', { token, marked_by: markedBy })
  if (error) throw error
  return data
}

export async function regenerateQrToken(personTable, personId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('regenerate_qr_token', { person_table: personTable, person_id: personId })
  if (error) throw error
  return data
}
