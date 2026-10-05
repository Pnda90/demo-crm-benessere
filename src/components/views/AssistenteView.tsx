import { Bot, Sparkles, Shield, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function AssistenteView() {
  return (
    <div className="py-8 max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Bot className="w-3.5 h-3.5" />
          <span>Modulo AI Previsto in Fase 5</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Assistente AI Commerciale</h2>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Analisi clienti a rischio, suggerimenti di rinnovo e sintesi delle metriche del centro benessere.
        </p>
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-neutral-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Architettura di Sicurezza (Zero Chiavi nel Frontend)</span>
          </CardTitle>
          <CardDescription className="text-xs text-neutral-400">
            Come funzionerà l'integrazione nella Fase 5:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-neutral-300">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Edge Function Protetta</strong>
              <span>Il frontend interroga esclusivamente una Supabase Edge Function autenticata. Nessuna API key di Claude o Gemini viaggia sul browser.</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Doppio Provider AI Flessibile</strong>
              <span>Supporto sia a Google Gemini (100% gratuito per la demo) che ad Anthropic Claude 3.5 Sonnet con selezione dinamica via variabili server.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
