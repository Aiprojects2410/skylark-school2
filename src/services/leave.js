import { supabase } from '../lib/supabase'

export async function getLeaveRequests() {
  if (!supabase) return []
  const { data, error } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function applyLeave(payload) {
  if (!supabase) return { ...payload, id: crypto.randomUUID(), status: 'pending' }
  const { data, error } = await supabase.from('leave_requests').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function reviewLeave(id, status, reviewedBy) {
  if (!supabase) return
  const { error } = await supabase.from('leave_requests').update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
