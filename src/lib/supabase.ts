import { createClient } from '@supabase/supabase-js'

// Valori PUBBLICI letti da .env.local (vedi .env.example).
// La chiave "publishable" può stare nel browser: cosa si può leggere/scrivere
// lo decidono i GRANT e le policy RLS nel database, non il frontend.
const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('Mancano VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')
}

export const supabase = createClient(url, publishableKey)
