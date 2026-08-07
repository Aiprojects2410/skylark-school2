import { supabase } from '../lib/supabase'

export async function createTicket({ subject, description, category = 'technical', priority = 'medium', pagePath, screenshot }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  let screenshotPath = null
  if (screenshot) {
    const ext = screenshot.type === 'image/png' ? 'png' : 'jpg'
    screenshotPath = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('support-attachments').upload(screenshotPath, screenshot, {
      upsert: false,
      contentType: screenshot.type || 'image/jpeg',
    })
    if (error) throw error
  }

  const { data, error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    subject: subject?.trim() || 'Issue reported from portal',
    description: description?.trim() || '',
    category,
    priority,
    page_path: pagePath || window.location.pathname,
    screenshot_path: screenshotPath,
  }).select('id,ticket_number,status,created_at').single()

  if (error) throw error
  return data
}

export async function listMyTickets() {
  if (!supabase) return []
  const { data, error } = await supabase.from('support_tickets')
    .select('id,ticket_number,subject,category,priority,status,created_at,updated_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listAllTickets() {
  if (!supabase) return []
  const { data, error } = await supabase.from('support_tickets')
    .select('id,ticket_number,subject,category,priority,status,page_path,description,created_at,updated_at,user_id,profiles:profiles!support_tickets_user_id_fkey(full_name,email,role)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateTicket(id, updates) {
  const { data, error } = await supabase.from('support_tickets').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function addTicketMessage(ticketId, message) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')
  const { data, error } = await supabase.from('support_ticket_messages').insert({ ticket_id: ticketId, sender_id: user.id, message }).select().single()
  if (error) throw error
  return data
}

export async function listTicketMessages(ticketId) {
  const { data, error } = await supabase.from('support_ticket_messages')
    .select('id,message,sender_id,sender_role,created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}
