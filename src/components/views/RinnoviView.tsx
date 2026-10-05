import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RinnovoInScadenza } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CalendarClock,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

export function RinnoviView() {

  const [rinnovi, setRinnovi] = useState<RinnovoInScadenza[]>([])
  const [loading, setLoading] = useState(true)

  async function loadRinnovi() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rinnovi_in_scadenza')
      .select('*')
      .order('giorni_a_scadenza', { ascending: true })

    if (!error && data) {
      setRinnovi(data as RinnovoInScadenza[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRinnovi()
  }, [])

  const getUrgencyBadge = (giorni: number) => {
    if (giorni <= 5) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] gap-1 font-semibold">
          <AlertCircle className="w-3 h-3" />
          Scade tra {giorni} {giorni === 1 ? 'giorno' : 'giorni'}
        </Badge>
      )
    }
    if (giorni <= 15) {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] gap-1 font-semibold">
          <CalendarClock className="w-3 h-3" />
          Scade tra {giorni} giorni
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] gap-1 font-semibold">
        <CheckCircle2 className="w-3 h-3" />
        Scade tra {giorni} giorni
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Rinnovi in Scadenza (Prossimi 30gg)</span>
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
              {rinnovi.length} Attivi
            </Badge>
          </h2>
          <p className="text-xs text-neutral-400">
            Dati calcolati in tempo reale dalla vista Postgres <code className="text-emerald-400">rinnovi_in_scadenza</code> (security invoker).
          </p>
        </div>
      </div>

      {/* Spiegazione Colloquio */}
      <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400 flex items-center justify-between">
        <span>
          💡 In questa vista l'agente commerciale visualizza solo i propri rinnovi prioritari, mentre l'operatore alla reception ha una panoramica completa per l'accoglienza clienti.
        </span>
      </div>

      {/* Lista Rinnovi */}
      {loading ? (
        <div className="text-center py-12 text-xs text-neutral-500 animate-pulse">
          Interrogazione vista protetta rinnovi_in_scadenza...
        </div>
      ) : rinnovi.length === 0 ? (
        <div className="text-center py-12 text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
          Nessun abbonamento in scadenza nei prossimi 30 giorni nel tuo perimetro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rinnovi.map((r) => (
            <Card key={r.abbonamento_id} className="bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 transition">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-100">
                      {r.cliente_nome}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Piano: <span className="text-neutral-200 font-medium">{r.piano}</span>
                    </p>
                  </div>
                  {getUrgencyBadge(r.giorni_a_scadenza)}
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-y border-neutral-800/60 text-neutral-400">
                  <span>Data scadenza: <strong className="text-neutral-200">{r.data_fine}</strong></span>
                  <span className="font-bold text-neutral-100 text-sm">
                    {Number(r.prezzo).toFixed(2)} €
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    {r.cliente_telefono && (
                      <a
                        href={`tel:${r.cliente_telefono}`}
                        className="flex items-center gap-1 hover:text-emerald-400 transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Chiama</span>
                      </a>
                    )}
                    {r.cliente_email && (
                      <a
                        href={`mailto:${r.cliente_email}`}
                        className="flex items-center gap-1 hover:text-emerald-400 transition truncate max-w-[140px]"
                      >
                        <Mail className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="truncate">Email</span>
                      </a>
                    )}
                  </div>

                  {/* Azione rapida Rinnovo: agganciata a Stripe in Fase 4 */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs gap-1.5"
                    onClick={() => {
                      alert(`In Fase 4 questo pulsante genererà un link di pagamento Stripe Checkout per il rinnovo di ${r.cliente_nome} (${r.piano}).`)
                    }}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Invia Link Stripe</span>
                    <span className="text-[9px] bg-neutral-800 px-1 rounded text-neutral-400">
                      Fase 4
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
