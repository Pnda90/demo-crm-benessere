export type RuoloUtente = 'admin' | 'agente' | 'operatore'

export interface Profilo {
  id: string
  nome: string
  ruolo: RuoloUtente
  percentuale_provvigione: number
  created_at?: string
}

export interface Cliente {
  id: number
  nome: string
  email: string | null
  telefono: string | null
  note: string | null
  agente_id: string | null
  created_at: string
}

export interface Abbonamento {
  id: number
  cliente_id: number
  piano: string
  prezzo: number
  data_inizio: string
  data_fine: string
  stato: 'attivo' | 'scaduto' | 'annullato'
  created_at: string
}

export interface Pagamento {
  id: number
  abbonamento_id: number
  importo: number
  stato: 'in_attesa' | 'pagato' | 'fallito' | 'rimborsato'
  stripe_session_id: string | null
  pagato_il: string | null
  created_at: string
}

export interface Provvigione {
  id: number
  agente_id: string
  pagamento_id: number
  importo: number
  created_at: string
}

export interface RinnovoInScadenza {
  abbonamento_id: number
  cliente_id: number
  cliente_nome: string
  cliente_email: string | null
  cliente_telefono: string | null
  agente_id: string | null
  piano: string
  prezzo: number
  data_inizio: string
  data_fine: string
  giorni_a_scadenza: number
}
