import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const hasSupabase = Boolean(url && key && !url.includes('your-project'))

// Using sessionStorage (not localStorage) means the login only lasts for as long as the
// browser tab/window stays open. Closing the browser ends the session — the next visit
// always requires signing in again. This also means a session left open on someone else's
// device won't silently persist once they close that browser.
export const supabase = hasSupabase ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: typeof window !== 'undefined' ? window.sessionStorage : undefined },
}) : null
