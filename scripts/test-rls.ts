// =============================================================================
// Test della sicurezza (GRANT + RLS) contro il database Supabase reale.
// Usa SOLO la chiave publishable, esattamente come il browser: se un dato
// non deve essere visibile, qui non deve arrivare.
// Esecuzione: npm run test:rls
// =============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL!
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
const PASSWORD = 'DemoCRM2026!' // password degli utenti demo fittizi (vedi seed.sql)

const AGENTE1 = 'a0000000-0000-4000-8000-000000000002'
const AGENTE2 = 'a0000000-0000-4000-8000-000000000003'
const CLIENTE_DI_AGENTE1 = 'giulia.fittizi@cliente.example'
const CLIENTE_DI_AGENTE2 = 'roberto.test@cliente.example'

let falliti = 0
function verifica(descrizione: string, ok: boolean, dettaglio = '') {
  if (!ok) falliti++
  console.log(`  ${ok ? '✅' : '❌'} ${descrizione}${dettaglio ? `  → ${dettaglio}` : ''}`)
}

function nuovoClient() {
  return createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function loginCome(email: string): Promise<SupabaseClient> {
  const sb = nuovoClient()
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`Login fallito per ${email}: ${error.message}`)
  return sb
}

// ---------------------------------------------------------------------------
async function testAnonimo() {
  console.log('\n👤 Utente NON loggato (anon)')
  const sb = nuovoClient()
  for (const tabella of ['clienti', 'abbonamenti', 'pagamenti', 'provvigioni', 'profili']) {
    const { data, error } = await sb.from(tabella).select('*')
    // Nessun GRANT ad anon: ci aspettiamo "permission denied" (o comunque zero righe)
    verifica(`non può leggere ${tabella}`, !!error || data?.length === 0, error?.message ?? `${data?.length} righe`)
  }
}

// ---------------------------------------------------------------------------
async function testAdmin() {
  console.log('\n👑 admin@demo.local')
  const sb = await loginCome('admin@demo.local')

  const clienti = await sb.from('clienti').select('id')
  verifica('vede tutti i 12 clienti', clienti.data?.length === 12, `${clienti.data?.length} righe`)

  const profili = await sb.from('profili').select('id')
  verifica('vede tutti i 4 profili', profili.data?.length === 4, `${profili.data?.length} righe`)

  const provv = await sb.from('provvigioni').select('agente_id')
  const agenti = new Set(provv.data?.map((p) => p.agente_id))
  verifica('vede le provvigioni di entrambi gli agenti', agenti.has(AGENTE1) && agenti.has(AGENTE2), `${provv.data?.length} righe`)
}

// ---------------------------------------------------------------------------
async function testAgente() {
  console.log('\n💼 agente1@demo.local (Marco)')
  const sb = await loginCome('agente1@demo.local')

  const clienti = await sb.from('clienti').select('id, agente_id')
  const soloSuoi = !!clienti.data?.length && clienti.data.every((c) => c.agente_id === AGENTE1)
  verifica('vede solo i propri 5 clienti', soloSuoi && clienti.data?.length === 5, `${clienti.data?.length} righe`)

  const altrui = await sb.from('clienti').select('id').eq('email', CLIENTE_DI_AGENTE2)
  verifica("NON vede il cliente dell'altro agente", altrui.data?.length === 0, `${altrui.data?.length} righe`)

  const modAltrui = await sb.from('clienti').update({ note: 'hack' }).eq('email', CLIENTE_DI_AGENTE2).select()
  verifica("NON può modificare il cliente dell'altro agente", modAltrui.data?.length === 0, `${modAltrui.data?.length} righe modificate`)

  const insAltrui = await sb.from('clienti').insert({ nome: 'Intruso', agente_id: AGENTE2 })
  verifica("NON può creare un cliente intestato a un altro agente", !!insAltrui.error, insAltrui.error?.message)

  const riassegna = await sb.from('clienti').update({ agente_id: AGENTE2 }).eq('email', CLIENTE_DI_AGENTE1).select()
  verifica('NON può riassegnare un proprio cliente ad altri', !!riassegna.error, riassegna.error?.message)

  const elimina = await sb.from('clienti').delete().eq('email', CLIENTE_DI_AGENTE1).select()
  verifica('NON può eliminare clienti (solo admin)', elimina.data?.length === 0, `${elimina.data?.length} righe eliminate`)

  const abb = await sb.from('abbonamenti').select('id')
  verifica('vede solo i 5 contratti dei propri clienti', abb.data?.length === 5, `${abb.data?.length} righe`)

  const provv = await sb.from('provvigioni').select('agente_id')
  const provvSue = !!provv.data?.length && provv.data.every((p) => p.agente_id === AGENTE1)
  verifica('vede solo le proprie provvigioni', provvSue, `${provv.data?.length} righe`)

  const promozione = await sb.from('profili').update({ ruolo: 'admin' }).eq('id', AGENTE1).select()
  const { data: profilo } = await sb.from('profili').select('ruolo').eq('id', AGENTE1).single()
  verifica('NON può promuoversi admin', promozione.data?.length === 0 && profilo?.ruolo === 'agente', `ruolo attuale: ${profilo?.ruolo}`)

  const provvAlta = await sb.from('profili').update({ percentuale_provvigione: 90 }).eq('id', AGENTE1).select()
  verifica('NON può alzarsi la percentuale di provvigione', provvAlta.data?.length === 0, `${provvAlta.data?.length} righe modificate`)
}

// ---------------------------------------------------------------------------
async function testOperatore() {
  console.log('\n🧾 operatore@demo.local (Luca)')
  const sb = await loginCome('operatore@demo.local')

  const clienti = await sb.from('clienti').select('id')
  verifica('vede tutti i 12 clienti', clienti.data?.length === 12, `${clienti.data?.length} righe`)

  const provv = await sb.from('provvigioni').select('*')
  verifica('NON vede alcuna provvigione', provv.data?.length === 0, `${provv.data?.length} righe`)

  const insProvv = await sb.from('provvigioni').insert({ agente_id: AGENTE1, pagamento_id: 1, importo: 999 })
  verifica('NON può inserire provvigioni', !!insProvv.error, insProvv.error?.message)

  const abb = await sb.from('abbonamenti').select('id')
  verifica('legge tutti i 12 contratti', abb.data?.length === 12, `${abb.data?.length} righe`)

  const insAbb = await sb.from('abbonamenti').insert({
    cliente_id: 1, piano: 'Gratis', prezzo: 0, data_inizio: '2026-01-01', data_fine: '2026-12-31',
  })
  verifica('NON può creare contratti (sola lettura)', !!insAbb.error, insAbb.error?.message)

  const modNote = await sb.from('clienti').update({ note: 'Verificato dal test RLS' }).eq('email', CLIENTE_DI_AGENTE1).select()
  verifica('può aggiornare i dati anagrafici di un cliente', modNote.data?.length === 1, `${modNote.data?.length} righe modificate`)

  const riassegna = await sb.from('clienti').update({ agente_id: AGENTE2 }).eq('email', CLIENTE_DI_AGENTE1).select()
  verifica('NON può riassegnare un cliente a un altro agente', !!riassegna.error, riassegna.error?.message)

  const elimina = await sb.from('clienti').delete().eq('email', CLIENTE_DI_AGENTE1).select()
  verifica('NON può eliminare clienti', elimina.data?.length === 0, `${elimina.data?.length} righe eliminate`)

  const promozione = await sb.from('profili').update({ ruolo: 'admin' }).eq('id', 'a0000000-0000-4000-8000-000000000004').select()
  verifica('NON può promuoversi admin', promozione.data?.length === 0, `${promozione.data?.length} righe modificate`)
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`Test RLS su ${URL}`)
  await testAnonimo()
  await testAdmin()
  await testAgente()
  await testOperatore()
  console.log(falliti === 0 ? '\n🎉 Tutti i test superati' : `\n💥 ${falliti} test falliti`)
  process.exit(falliti === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
