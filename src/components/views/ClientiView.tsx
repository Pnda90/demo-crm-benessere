import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Cliente, Abbonamento } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Search,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  ChevronRight
} from 'lucide-react'

export function ClientiView() {
  const { profilo, user } = useAuth()
  const ruolo = profilo?.ruolo ?? 'operatore'

  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [abbonamentiCliente, setAbbonamentiCliente] = useState<Abbonamento[]>([])
  const [loadingAbb, setLoadingAbb] = useState(false)

  // Modale Nuovo Cliente
  const [modalOpen, setModalOpen] = useState(false)
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovaEmail, setNuovaEmail] = useState('')
  const [nuovoTelefono, setNuovoTelefono] = useState('')
  const [nuoveNote, setNuoveNote] = useState('')
  const [erroreIns, setErroreIns] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function loadClienti() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clienti')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setClienti(data as Cliente[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClienti()
  }, [])

  // Caricamento abbonamenti del cliente selezionato
  async function apriDettaglio(c: Cliente) {
    setSelectedCliente(c)
    setLoadingAbb(true)
    const { data } = await supabase
      .from('abbonamenti')
      .select('*')
      .eq('cliente_id', c.id)
      .order('id', { ascending: false })

    setAbbonamentiCliente((data as Abbonamento[]) || [])
    setLoadingAbb(false)
  }

  // Creazione Nuovo Cliente con rispetto RLS
  async function handleCreaCliente(e: React.FormEvent) {
    e.preventDefault()
    setErroreIns('')
    setSalvando(true)

    // Se l'utente è un agente, assegna automaticamente sé stesso.
    // L'RLS vieterebbe all'agente di assegnare id diversi dal proprio auth.uid().
    const agenteId = ruolo === 'agente' ? user?.id : null

    const { data, error } = await supabase
      .from('clienti')
      .insert({
        nome: nuovoNome.trim(),
        email: nuovaEmail.trim() || null,
        telefono: nuovoTelefono.trim() || null,
        note: nuoveNote.trim() || null,
        agente_id: agenteId,
      })
      .select()
      .single()

    setSalvando(false)

    if (error) {
      setErroreIns(error.message)
    } else if (data) {
      setClienti([data as Cliente, ...clienti])
      setModalOpen(false)
      setNuovoNome('')
      setNuovaEmail('')
      setNuovoTelefono('')
      setNuoveNote('')
    }
  }

  const clientiFiltrati = clienti.filter((c) => {
    const s = searchTerm.toLowerCase()
    return (
      c.nome.toLowerCase().includes(s) ||
      (c.email && c.email.toLowerCase().includes(s)) ||
      (c.telefono && c.telefono.includes(s))
    )
  })

  return (
    <div className="space-y-4">
      {/* Intestazione e Azioni */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Anagrafica Clienti</span>
            <Badge variant="outline" className="text-xs text-neutral-400">
              {clienti.length} Visibili
            </Badge>
          </h2>
          <p className="text-xs text-neutral-400">
            {ruolo === 'agente'
              ? 'Elenco limitato ai clienti assegnati al tuo portafoglio.'
              : 'Elenco completo degli iscritti al centro benessere.'}
          </p>
        </div>

        {/* Pulsante Nuovo Cliente */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 h-9">
              <UserPlus className="w-4 h-4" />
              <span>Nuovo Cliente</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Nuova Anagrafica Cliente</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                {ruolo === 'agente'
                  ? 'Il cliente verrà intestato automaticamente al tuo account commerciale.'
                  : 'Inserimento anagrafica generale.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreaCliente} className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-neutral-300">Nome e Cognome *</label>
                <Input
                  required
                  value={nuovoNome}
                  onChange={(e) => setNuovoNome(e.target.value)}
                  placeholder="Es. Mario Rossi"
                  className="bg-neutral-950 border-neutral-800 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-300">Email</label>
                  <Input
                    type="email"
                    value={nuovaEmail}
                    onChange={(e) => setNuovaEmail(e.target.value)}
                    placeholder="mario@example.com"
                    className="bg-neutral-950 border-neutral-800 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-300">Telefono</label>
                  <Input
                    type="tel"
                    value={nuovoTelefono}
                    onChange={(e) => setNuovoTelefono(e.target.value)}
                    placeholder="+39 340 ..."
                    className="bg-neutral-950 border-neutral-800 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-300">Note Benessere / Esigenze</label>
                <Input
                  value={nuoveNote}
                  onChange={(e) => setNuoveNote(e.target.value)}
                  placeholder="Es. Percorso Spa termale, massaggio..."
                  className="bg-neutral-950 border-neutral-800 text-xs mt-1"
                />
              </div>

              {erroreIns && (
                <div className="p-2 text-xs rounded bg-red-950 border border-red-800 text-red-300">
                  {erroreIns}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={salvando}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  {salvando ? 'Salvataggio...' : 'Crea Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra di Ricerca */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca cliente per nome, email o telefono..."
          className="pl-9 bg-neutral-900 border-neutral-800 text-xs h-9 text-white placeholder:text-neutral-500"
        />
      </div>

      {/* Lista Clienti Responsive */}
      {loading ? (
        <div className="text-center py-12 text-xs text-neutral-500 animate-pulse">
          Caricamento clienti con permessi RLS...
        </div>
      ) : clientiFiltrati.length === 0 ? (
        <div className="text-center py-12 text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
          Nessun cliente trovato per i criteri specificati.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clientiFiltrati.map((c) => (
            <Card
              key={c.id}
              onClick={() => apriDettaglio(c)}
              className="bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 cursor-pointer transition"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm text-neutral-200">
                    {c.nome}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                </div>

                <div className="space-y-1 text-xs text-neutral-400">
                  {c.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span>{c.telefono}</span>
                    </div>
                  )}
                  {c.note && (
                    <p className="text-[11px] text-neutral-500 line-clamp-1 italic pt-1">
                      "{c.note}"
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dettaglio Cliente & Abbonamenti (Dialog) */}
      <Dialog open={!!selectedCliente} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg">
          {selectedCliente && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base text-white">
                    {selectedCliente.nome}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] text-neutral-400">
                    ID #{selectedCliente.id}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-neutral-400">
                  Dettagli anagrafici e contratti sottoscritti
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Dati recapiti */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div>
                    <span className="text-neutral-500 block">Email</span>
                    <span className="text-neutral-200 font-medium">
                      {selectedCliente.email || 'Non indicata'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Telefono</span>
                    <span className="text-neutral-200 font-medium">
                      {selectedCliente.telefono || 'Non indicato'}
                    </span>
                  </div>
                </div>

                {/* Abbonamenti */}
                <div>
                  <h4 className="font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Abbonamenti / Contratti ({abbonamentiCliente.length})</span>
                  </h4>

                  {loadingAbb ? (
                    <p className="text-neutral-500 py-3 text-center">Caricamento contratti...</p>
                  ) : abbonamentiCliente.length === 0 ? (
                    <p className="text-neutral-500 py-3 text-center italic">
                      Nessun abbonamento attivo registrato per questo cliente.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {abbonamentiCliente.map((a) => (
                        <div
                          key={a.id}
                          className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950/70 flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-200">{a.piano}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  a.stato === 'attivo'
                                    ? 'border-emerald-500/40 text-emerald-400'
                                    : 'border-neutral-700 text-neutral-500'
                                }`}
                              >
                                {a.stato}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-neutral-400 block mt-0.5">
                              Scadenza: {a.data_fine}
                            </span>
                          </div>
                          <span className="font-bold text-neutral-100">
                            {Number(a.prezzo).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
