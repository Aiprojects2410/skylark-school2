import { supabase } from '../lib/supabase'

export async function getInvoices() {
  if (!supabase) return []
  const { data, error } = await supabase.from('fee_invoices').select('*, students(full_name), fee_payments(receipt_number,amount,payment_date)').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(i => ({
    ...i,
    amount: Number(i.total_amount || 0),
    student_name: i.students?.full_name || '',
    receipt: i.fee_payments?.[0]?.receipt_number || '',
    payment_date: i.fee_payments?.[0]?.payment_date || null,
  }))
}
