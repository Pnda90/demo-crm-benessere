import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  CalendarClock,
  CircleDollarSign,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lock
} from 'lucide-react'
import type { TabView } from '@/components/layout/AppLayout'

interface DashboardViewProps {
  onNavigate: (tab: TabView) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { profilo } = useAuth()
  const ruolo = profilo?.ruolo ?? 'operatore'

  const [totClienti, setTotClienti] = useState<number | null>(null)
  const [totRinnovi, setTotRinnovi] = useState<number | null>(null)
  const [totProvvigioni, setTotProvvigioni] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadKpi() {
      setLoading(true)

      // 1. Clienti visibili per questo ruolo (RLS applicata da Postgres)
      const { count: countClienti } = await supabase
        .from('clienti')
        .select('*', { count: 'exact', head: true })
      setTotClienti(countClienti ?? 0)

      // 2. Rinnovi visibili (dalla vista con security_invoker)
      const { count: countRinnovi } = await supabase
        .from('rinnovi_in_scadenza')
        .select('*', { count: 'exact', head: true })
      setTotRinnovi(countRinnovi ?? 0)

      // 3. Provvigioni (se operatore, restituirà 0 righe per RLS)
      if (ruolo !== 'operatore') {
        const { data: provv } = await supabase.from('provvigioni').select('importo')
        const somma = (provv || []).reduce((acc, curr) => acc + Number(curr.importo), 0)
        setTotProvvigioni(somma)
      } else {
        setTotProvvigioni(null)
      }

      setLoading(false)
    }

    loadKpi()
  }, [ruolo])

  return (
    <div className="space-y-6">
      {/* Banner Contestuale di Sicurezza (Ottimo da mostrare al colloquio) */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-200">
                Modalità Ruolo: <span className="uppercase text-emerald-400">{ruolo}</span>
              </h2>
              <Badge variant="outline" className="text-[10px] bg-neutral-800 text-neutral-300">
                Postgres RLS Attiva
              </Badge>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {ruolo === 'admin' &&
                'Visualizzazione globale: accesso completo a clienti, contratti e ripartizione provvigioni.'}
              {ruolo === 'agente' &&
                `Segregazione commerciale: il database ti mostra solo i tuoi clienti e le tue provvigioni (${profilo?.percentuale_provvigione}%).`}
              {ruolo === 'operatore' &&
                'Accoglienza / Reception: consulti clienti e rinnovi in ingresso, ma la RLS impedisce l\'accesso ai dati economici delle provvigioni.'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI Clienti */}
        <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-400">
              {ruolo === 'agente' ? 'I Miei Clienti' : 'Clienti Gestiti'}
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : totClienti}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {ruolo === 'agente' ? 'Assegnati al tuo account' : 'Totale attivo nel CRM'}
            </p>
          </CardContent>
        </Card>

        {/* KPI Rinnovi in Scadenza */}
        <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-400">
              Rinnovi (30 Giorni)
            </CardTitle>
            <CalendarClock className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-300">
              {loading ? '...' : totRinnovi}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Contratti attivi prossimi alla scadenza
            </p>
          </CardContent>
        </Card>

        {/* KPI Provvigioni (o Alert RLS se Operatore) */}
        <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-400">
              {ruolo === 'agente' ? 'Le Tue Provvigioni' : 'Provvigioni Generate'}
            </CardTitle>
            {ruolo === 'operatore' ? (
              <Lock className="w-4 h-4 text-neutral-500" />
            ) : (
              <CircleDollarSign className="w-4 h-4 text-purple-400" />
            )}
          </CardHeader>
          <CardContent>
            {ruolo === 'operatore' ? (
              <div>
                <span className="text-sm font-semibold text-neutral-500 flex items-center gap-1.5 mt-1">
                  <Lock className="w-3.5 h-3.5" /> Protetto da RLS
                </span>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Non visibile al ruolo operatore
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold text-purple-300">
                  {loading ? '...' : `${(totProvvigioni ?? 0).toFixed(2)} €`}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {ruolo === 'agente'
                    ? `Maturate su pagamenti incassati`
                    : 'Totale rete commerciale'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scorciatoie di Navigazione Rapida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate('rinnovi')}
          className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-200 group-hover:text-white">
                Controlla Rinnovi in Scadenza
              </h3>
              <p className="text-xs text-neutral-400">
                Identifica i clienti a rischio abbandono e proponi il rinnovo.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition" />
        </div>

        <div
          onClick={() => onNavigate('clienti')}
          className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-200 group-hover:text-white">
                Gestione Anagrafica Clienti
              </h3>
              <p className="text-xs text-neutral-400">
                Consulta recapiti, abbonamenti attivi e inserisci nuovi iscritti.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition" />
        </div>
      </div>
    </div>
  )
}
