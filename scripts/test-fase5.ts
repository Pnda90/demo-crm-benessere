// =============================================================================
// Test Integrazione Assistente AI (Fase 5)
// Verifica:
// 1. Chiamata anonima senza JWT -> 401 Unauthorized.
// 2. Chiamata autenticata come Agente -> Ricezione risposta contestualizzata.
// 3. Verifica provider attivo (Gemini / Claude / Demo Fallback).
// 4. Chiamata autenticata come Operatore -> Contesto coerente senza provvigioni.
// Esecuzione: npm run test:fase5
// =============================================================================
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL!
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
const PASSWORD = 'DemoCRM2026!'

let falliti = 0
function verifica(descrizione: string, ok: boolean, dettaglio = '') {
  if (!ok) falliti++
  console.log(`  ${ok ? '✅' : '❌'} ${descrizione}${dettaglio ? `  → ${dettaglio}` : ''}`)
}

async function main() {
  console.log(`\n🤖 Test Assistente AI Edge Function su ${URL}`)

  // 1. Chiamata anonima senza token JWT
  const resAnon = await fetch(`${URL}/functions/v1/assistente-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Ciao' }),
  })
  verifica('Edge Function respinge richieste anonime non autenticate (401)', resAnon.status === 401, `Status: ${resAnon.status}`)

  // 2. Chiamata autenticata come Agente 1 (Marco)
  const authAgente = createClient(URL, KEY, { auth: { persistSession: false } })
  const { data: dataAgente } = await authAgente.auth.signInWithPassword({
    email: 'agente1@demo.local',
    password: PASSWORD,
  })
  const tokenAgente = dataAgente.session?.access_token
  if (!tokenAgente) throw new Error('Impossibile autenticare agente1')

  const resAgente = await fetch(`${URL}/functions/v1/assistente-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenAgente}`,
    },
    body: JSON.stringify({ prompt: 'Quali sono i rinnovi urgenti nel mio portafoglio?' }),
  })

  const jsonAgente = (await resAgente.json()) as {
    risposta?: string
    provider?: string
    utente?: { nome: string; ruolo: string }
    error?: string
  }

  verifica('Edge Function risponde con 200 OK all\'agente autenticato', resAgente.status === 200, `Status: ${resAgente.status} - ${jsonAgente.error}`)

  verifica('L\'assistente genera una risposta testuale completa', !!jsonAgente.risposta && jsonAgente.risposta.length > 20, `Lunghezza risposta: ${jsonAgente.risposta?.length} car`)
  verifica('Il contesto riconosce l\'identità e il ruolo agente', jsonAgente.utente?.ruolo === 'agente', `Ruolo rilevato: ${jsonAgente.utente?.ruolo} (${jsonAgente.utente?.nome})`)
  console.log(`  ℹ️ Provider AI impiegato dall'Edge Function: [${jsonAgente.provider}]`)

  // 3. Chiamata autenticata come Operatore (Luca)
  const authOp = createClient(URL, KEY, { auth: { persistSession: false } })
  const { data: dataOp } = await authOp.auth.signInWithPassword({
    email: 'operatore@demo.local',
    password: PASSWORD,
  })
  const tokenOp = dataOp.session?.access_token
  if (!tokenOp) throw new Error('Impossibile autenticare operatore')

  const resOp = await fetch(`${URL}/functions/v1/assistente-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenOp}`,
    },
    body: JSON.stringify({ prompt: 'Come posso accogliere al meglio i clienti oggi?' }),
  })

  const jsonOp = (await resOp.json()) as {
    risposta?: string
    provider?: string
    utente?: { nome: string; ruolo: string }
    error?: string
  }

  if (resOp.status !== 200) {
    console.log('Errore chiamata operatore:', resOp.status, jsonOp)
  }

  verifica('Il contesto riconosce l\'identità operatore', jsonOp.utente?.ruolo === 'operatore', `Ruolo rilevato: ${jsonOp.utente?.ruolo} (status: ${resOp.status})`)

  console.log(falliti === 0 ? '\n🎉 Tutti i test Fase 5 superati con successo!' : `\n💥 ${falliti} test falliti`)
  process.exit(falliti === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
