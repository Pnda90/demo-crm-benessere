import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Provvigione } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CircleDollarSign,
  ShieldAlert,
  Lock,
  CheckCircle
} from 'lucide-react'

interface ProvvigioneDettaglio extends Provvigione {
  agente_nome?: string
}

export function ProvvigioniView() {
  const { profilo } = useAuth()
  const ruolo = profilo?.ruolo ?? 'operatore'

  const [provvigioni, setProvvigioni] = useState<ProvvigioneDettaglio[]>([])
  const [loading, setLoading] = useState(true)
  const [totale, setTotale] = useState(0)

  useEffect(() => {
    async function loadProvvigioni() {
      // Se operatore, l'RLS comunque vieterebbe la lettura:
      if (ruolo === 'operatore') {
        setLoading(false)
        return
      }

      setLoading(true)

      // Query diretta a public.provvigioni (filtrata automaticamente dalla RLS)
      const { data, error } = await supabase
        .from('provvigioni')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        const list = data as ProvvigioneDettaglio[]
        setProvvigioni(list)
        const somma = list.reduce((acc, curr) => acc + Number(curr.importo), 0)
        setTotale(somma)
      }
      setLoading(false)
    }

    loadProvvigioni()
  }, [ruolo])

  // CASO 1: RUOLO OPERATORE (Tentativo di accesso non autorizzato)
  if (ruolo === 'operatore') {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Accesso Riservato</h2>
          <p className="text-xs text-neutral-400">
            I dati delle provvigioni commerciali sono protetti a livello database.
          </p>
        </div>

        <Card className="bg-neutral-900 border-neutral-800 text-left w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-neutral-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Verifica di Sicurezza (RLS Spiegata al Colloquio)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 space-y-2">
            <p>
              In conformità alla policy Postgres <code className="text-emerald-400">provvigioni_select</code>,
              nessuna riga di questa tabella viene trasmessa al ruolo <code className="text-neutral-200">operatore</code>.
            </p>
            <p className="text-[11px] text-neutral-500 italic">
              "Anche manomettendo il client o inviando query manuali alle API Supabase, Postgres restituisce zero risultati."
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // CASO 2: ADMIN O AGENTE
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Riepilogo Provvigioni</span>
            <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30">
              {ruolo === 'admin' ? 'Tutta la Rete' : `Provvigione Personale (${profilo?.percentuale_provvigione}%)`}
            </Badge>
          </h2>
          <p className="text-xs text-neutral-400">
            {ruolo === 'admin'
              ? 'Controllo complessivo delle provvigioni maturate dagli agenti commerciali.'
              : 'I tuoi compensi maturati automaticamente all\'incasso dei pagamenti.'}
          </p>
        </div>
      </div>

      {/* KPI Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-neutral-400 font-medium">
              Totale Provvigioni Maturate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-300">
              {loading ? '...' : `${totale.toFixed(2)} €`}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calcolate in Postgres dal trigger automatico</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-neutral-400 font-medium">
              Contratti Liquidati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">
              {loading ? '...' : provvigioni.length}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Transazioni andate a buon fine
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabella / Lista Provvigioni */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-200">
          Dettaglio Pagamenti & Provvigioni
        </h3>

        {loading ? (
          <div className="text-center py-12 text-xs text-neutral-500 animate-pulse">
            Caricamento provvigioni...
          </div>
        ) : provvigioni.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            Nessuna provvigione registrata.
          </div>
        ) : (
          <div className="space-y-2">
            {provvigioni.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                    <CircleDollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-200">
                      Provvigione #{p.id}
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      Rif. Pagamento #{p.pagamento_id} • Registrata il {p.created_at ? new Date(p.created_at).toLocaleDateString('it-IT') : 'Data n/d'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400 block">
                    +{Number(p.importo).toFixed(2)} €
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Incassata
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
