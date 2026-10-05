// =============================================================================
// Test delle logiche di business nel DB (Fase 2)
// Verifica:
// 1. Trigger calcolo automatico provvigione su incasso (pagamento -> provvigione).
// 2. Trigger cancellazione provvigione su rimborso.
// 3. Vista rinnovi_in_scadenza filtrata da RLS per ogni ruolo.
// Esecuzione: npm run test:fase2
// =============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL!
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
const PASSWORD = 'DemoCRM2026!'

const AGENTE1 = 'a0000000-0000-4000-8000-000000000002' // Marco Agente (10%)

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

async function testTriggerProvvigioni() {
  console.log('\n⚙️ Test Trigger Provvigioni Automatiche (Incasso e Storno)')
  const adminSb = await loginCome('admin@demo.local')

  // 1. Troviamo un cliente di Agente1 (ha provvigione 10%)
  const { data: cliente } = await adminSb
    .from('clienti')
    .select('id, agente_id')
    .eq('agente_id', AGENTE1)
    .limit(1)
    .single()

  if (!cliente) throw new Error('Nessun cliente trovato per Agente 1')

  // 2. Creiamo un nuovo abbonamento di test
  const { data: nuovoAbb, error: errAbb } = await adminSb
    .from('abbonamenti')
    .insert({
      cliente_id: cliente.id,
      piano: 'Test Trigger Spa',
      prezzo: 200.00,
      data_inizio: new Date().toISOString().slice(0, 10),
      data_fine: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      stato: 'attivo'
    })
    .select()
    .single()

  verifica('Admin crea abbonamento per test', !errAbb && !!nuovoAbb, errAbb?.message)

  // 3. Creiamo un pagamento con stato "in_attesa": non deve generare alcuna provvigione
  const { data: pagamento, error: errPag } = await adminSb
    .from('pagamenti')
    .insert({
      abbonamento_id: nuovoAbb.id,
      importo: 200.00,
      stato: 'in_attesa'
    })
    .select()
    .single()

  verifica('Pagamento "in_attesa" inserito', !errPag && !!pagamento, errPag?.message)

  const { data: provvPrima } = await adminSb
    .from('provvigioni')
    .select('*')
    .eq('pagamento_id', pagamento.id)

  verifica('Nessuna provvigione creata finché non è pagato', provvPrima?.length === 0, `${provvPrima?.length} righe`)

  // 4. Aggiorniamo lo stato a 'pagato': il trigger DEVE creare la provvigione (10% di 200 = 20.00)
  const { error: errUpdate } = await adminSb
    .from('pagamenti')
    .update({ stato: 'pagato', pagato_il: new Date().toISOString() })
    .eq('id', pagamento.id)

  verifica('Pagamento marcato come "pagato"', !errUpdate, errUpdate?.message)

  const { data: provvDopo } = await adminSb
    .from('provvigioni')
    .select('*')
    .eq('pagamento_id', pagamento.id)
    .single()

  const importoCorretto = provvDopo?.importo === 20.00 && provvDopo?.agente_id === AGENTE1
  verifica('Trigger ha calcolato e inserito automaticamente la provvigione (20.00€ per Agente 1)', importoCorretto, `Importo: ${provvDopo?.importo}€, Agente: ${provvDopo?.agente_id}`)

  // 5. Rimborso: portiamo il pagamento a 'rimborsato' -> la provvigione deve essere revocata
  await adminSb
    .from('pagamenti')
    .update({ stato: 'rimborsato' })
    .eq('id', pagamento.id)

  const { data: provvRevocata } = await adminSb
    .from('provvigioni')
    .select('*')
    .eq('pagamento_id', pagamento.id)

  verifica('Trigger storna/cancella la provvigione se il pagamento viene rimborsato', provvRevocata?.length === 0, `${provvRevocata?.length} righe`)

  // Pulizia record di test
  await adminSb.from('abbonamenti').delete().eq('id', nuovoAbb.id)
}

async function testVistaRinnovi() {
  console.log('\n📅 Test Vista "rinnovi_in_scadenza" con RLS')

  // 1. Admin vede tutti i rinnovi
  const adminSb = await loginCome('admin@demo.local')
  const { data: rinnoviAdmin, error: errAdmin } = await adminSb.from('rinnovi_in_scadenza').select('*')
  verifica('Admin accede alla vista rinnovi', !errAdmin, errAdmin?.message)
  verifica('Admin vede tutti i rinnovi nel range 30gg', (rinnoviAdmin?.length ?? 0) >= 4, `${rinnoviAdmin?.length} clienti in scadenza`)

  // 2. Agente 1 vede SOLO i propri rinnovi
  const ag1Sb = await loginCome('agente1@demo.local')
  const { data: rinnoviAg1, error: errAg1 } = await ag1Sb.from('rinnovi_in_scadenza').select('*')
  verifica('Agente 1 accede alla vista rinnovi', !errAg1, errAg1?.message)
  const soloSuoi = rinnoviAg1?.every((r) => r.agente_id === AGENTE1)
  verifica('Agente 1 vede SOLO i rinnovi dei suoi clienti', !!soloSuoi && (rinnoviAg1?.length ?? 0) > 0, `${rinnoviAg1?.length} rinnovi visibili`)

  // 3. Operatore vede tutti i rinnovi anagrafici ma zero provvigioni
  const opSb = await loginCome('operatore@demo.local')
  const { data: rinnoviOp, error: errOp } = await opSb.from('rinnovi_in_scadenza').select('*')
  verifica('Operatore accede alla vista rinnovi', !errOp, errOp?.message)
  verifica('Operatore vede tutti i rinnovi globali per accoglienza/reception', (rinnoviOp?.length ?? 0) === (rinnoviAdmin?.length ?? 0), `${rinnoviOp?.length} rinnovi visibili`)

  const { data: provvOp } = await opSb.from('provvigioni').select('*')
  verifica('Operatore ha comunque 0 accesso alle provvigioni', provvOp?.length === 0, `${provvOp?.length} righe`)
}

async function main() {
  console.log(`Verifica Logiche di Business (Fase 2) su ${URL}`)
  await testTriggerProvvigioni()
  await testVistaRinnovi()
  console.log(falliti === 0 ? '\n🎉 Tutti i test Fase 2 superati con successo!' : `\n💥 ${falliti} test falliti`)
  process.exit(falliti === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
