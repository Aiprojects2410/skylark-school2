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
    .select('id,ticket_number,subject,category,priority,status,created_at,updated_at,ai_status,ai_summary')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listAllTickets() {
  if (!supabase) return []
  const { data, error } = await supabase.from('support_tickets')
    .select('id,ticket_number,subject,category,priority,status,page_path,description,created_at,updated_at,user_id,profiles:profiles!support_tickets_user_id_fkey(full_name,email,role),ai_status,ai_summary,ai_root_cause,ai_confidence,ai_priority,ai_affected_files,ai_recommendation,ai_risk_level,ai_investigated_at,ai_error')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateTicket(id, updates) {
  const { data, error } = await supabase.from('support_tickets').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function investigateTicket(ticket) {
  const response = await fetch('/api/ai-investigate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      page_path: ticket.page_path,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'AI investigation failed.')

  const updates = {
    ai_status: 'completed',
    ai_summary: result.summary || null,
    ai_root_cause: result.root_cause || null,
    ai_confidence: Number.isFinite(result.confidence) ? result.confidence : null,
    ai_priority: result.priority || null,
    ai_affected_files: Array.isArray(result.affected_files) ? result.affected_files : [],
    ai_recommendation: [result.recommendation, ...(result.next_checks || []).map(x => `Next check: ${x}`)].filter(Boolean).join('\n'),
    ai_risk_level: result.risk_level || null,
    ai_investigated_at: new Date().toISOString(),
    ai_error: null,
  }
  const { data, error } = await supabase.from('support_tickets').update(updates).eq('id', ticket.id).select().single()
  if (error) throw error
  return data
}

export async function markAiInvestigating(id) {
  const { error } = await supabase.from('support_tickets').update({ ai_status: 'investigating', ai_error: null }).eq('id', id)
  if (error) throw error
}

export async function markAiFailed(id, message) {
  const { error } = await supabase.from('support_tickets').update({ ai_status: 'failed', ai_error: message, ai_investigated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
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
