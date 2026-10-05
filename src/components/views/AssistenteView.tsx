import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  User,
  Zap,
  HelpCircle,
  Cpu
} from 'lucide-react'

interface Messaggio {
  id: string
  mittente: 'utente' | 'ai'
  testo: string
  provider?: string
  orario: string
}

const PROMPT_SUGGERITI = [
  'Quali rinnovi sono più urgenti questa settimana?',
  'Proponi una promozione benessere per i clienti in scadenza',
  'Come posso massimizzare i miei rinnovi e le provvigioni?',
  'Fai una sintesi del mio portafoglio clienti',
]

export function AssistenteView() {
  const { profilo } = useAuth()
  const [messaggi, setMessaggi] = useState<Messaggio[]>([
    {
      id: 'benvenuto',
      mittente: 'ai',
      testo: `Ciao **${profilo?.nome ?? 'Utente'}**! Sono il tuo assistente AI specializzato per il centro benessere. I dati a cui posso accedere sono rigorosamente delimitati dal tuo ruolo (${profilo?.ruolo ?? 'operatore'}) tramite le policy Postgres RLS. Come posso aiutarti oggi?`,
      provider: 'assistente',
      orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputTesto, setInputTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [ultimoProvider, setUltimoProvider] = useState<string | null>(null)

  async function inviaDomanda(testoPrompt: string) {
    if (!testoPrompt.trim() || inviando) return

    const ora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const nuovoMessaggioUtente: Messaggio = {
      id: `u-${Date.now()}`,
      mittente: 'utente',
      testo: testoPrompt.trim(),
      orario: ora,
    }

    setMessaggi((prev) => [...prev, nuovoMessaggioUtente])
    setInputTesto('')
    setInviando(true)

    try {
      const { data, error } = await supabase.functions.invoke('assistente-ai', {
        body: { prompt: testoPrompt.trim() },
      })

      if (error) {
        throw new Error(error.message || 'Errore nella chiamata all\'assistente AI')
      }

      setUltimoProvider(data?.provider ?? 'ai')

      const rispostaAi: Messaggio = {
        id: `ai-${Date.now()}`,
        mittente: 'ai',
        testo: data?.risposta ?? 'Nessuna risposta ricevuta.',
        provider: data?.provider,
        orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessaggi((prev) => [...prev, rispostaAi])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      const rispostaErrore: Messaggio = {
        id: `err-${Date.now()}`,
        mittente: 'ai',
        testo: `⚠️ Si è verificato un errore: ${msg}`,
        orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessaggi((prev) => [...prev, rispostaErrore])
    } finally {
      setInviando(false)
    }
  }

  const getProviderBadge = (provider?: string) => {
    switch (provider) {
      case 'gemini':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] gap-1">
            <Zap className="w-3 h-3 text-emerald-400" /> Google Gemini Flash (Gratis)
          </Badge>
        )
      case 'claude':
        return (
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> Anthropic Claude 3.5 Sonnet
          </Badge>
        )
      case 'demo_fallback':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] gap-1">
            <Cpu className="w-3 h-3 text-amber-400" /> Dati Live CRM (Demo Fallback)
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header Assistente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <span>Assistente AI Commerciale</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Contestualizzato sui dati del CRM protetti da RLS • Eseguito via Supabase Edge Function
          </p>
        </div>

        {ultimoProvider && (
          <div className="flex items-center gap-2">
            {getProviderBadge(ultimoProvider)}
          </div>
        )}
      </div>

      {/* Box Didattico Colloquio */}
      <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-neutral-200 font-semibold block">
            Architettura Zero-Trust per l'AI
          </span>
          <span>
            Nessuna chiave AI (Gemini o Claude) risiede nel browser. L'Edge Function autentica l'utente con JWT, estrae dal DB solo i dati autorizzati dalla RLS e invia all'LLM un prompt circoscritto.
          </span>
        </div>
      </div>

      {/* Finestra Messaggi Chat */}
      <Card className="bg-neutral-900/80 border-neutral-800 h-[420px] flex flex-col shadow-inner">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messaggi.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                m.mittente === 'utente' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.mittente === 'utente'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {m.mittente === 'utente' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs space-y-1 ${
                  m.mittente === 'utente'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.testo}
                </div>
                <div className="flex items-center justify-between gap-3 text-[10px] opacity-60 pt-0.5">
                  <span>{m.orario}</span>
                  {m.provider && <span>{m.provider}</span>}
                </div>
              </div>
            </div>
          ))}

          {inviando && (
            <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse pl-9">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>L'assistente sta analizzando il contesto CRM...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggerimenti 1-Click per demo veloce al colloquio */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-medium">
          <HelpCircle className="w-3 h-3 text-neutral-500" />
          <span>Domande rapide consigliate per la demo:</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_SUGGERITI.map((p) => (
            <button
              key={p}
              disabled={inviando}
              onClick={() => inviaDomanda(p)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition text-left"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form per domande personalizzate */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          inviaDomanda(inputTesto)
        }}
        className="flex items-center gap-2"
      >
        <Input
          type="text"
          value={inputTesto}
          onChange={(e) => setInputTesto(e.target.value)}
          disabled={inviando}
          placeholder="Chiedi all'assistente AI (es. strategie rinnovo, analisi clienti)..."
          className="bg-neutral-900 border-neutral-800 text-xs text-white placeholder:text-neutral-500 h-10"
        />
        <Button
          type="submit"
          disabled={inviando || !inputTesto.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-4 text-xs gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Invia</span>
        </Button>
      </form>
    </div>
  )
}
