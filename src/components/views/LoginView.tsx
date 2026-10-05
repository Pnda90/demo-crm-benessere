import { useState } from 'react'
import { useAuth, DEMO_ACCOUNTS } from '@/context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Shield, UserCheck, Lock } from 'lucide-react'

export function LoginView() {
  const { loginDemo, loginWithCredentials, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loggingEmail, setLoggingEmail] = useState<string | null>(null)

  const handleDemoClick = async (demoEmail: string) => {
    setErrorMsg('')
    setLoggingEmail(demoEmail)
    try {
      await loginDemo(demoEmail)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore durante il login demo')
    } finally {
      setLoggingEmail(null)
    }
  }

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    const res = await loginWithCredentials(email, password)
    if (res.error) setErrorMsg(res.error)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Intestazione Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prototipo Dimostrativo CRM & AI</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            DEMO CRM Benessere
          </h1>
          <p className="text-sm text-neutral-400">
            Accesso sicuro con Postgres RLS & ruoli differenziati
          </p>
        </div>

        {/* Quick Demo Switcher per il colloquio */}
        <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-neutral-200 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Accesso Rapido Demo (1-Click)
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">
              Seleziona un ruolo per verificare istantaneamente la segregazione dei dati:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                disabled={loading}
                onClick={() => handleDemoClick(acc.email)}
                className="w-full text-left p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/60 hover:border-neutral-700 transition flex items-start justify-between gap-3 group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-neutral-200 group-hover:text-white">
                      {acc.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 border ${
                        acc.ruolo === 'admin'
                          ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                          : acc.ruolo === 'agente'
                          ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                          : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      }`}
                    >
                      {acc.ruolo}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-1">
                    {acc.desc}
                  </p>
                </div>
                {loggingEmail === acc.email && (
                  <span className="text-xs text-emerald-400 animate-pulse font-medium">
                    Accesso...
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Form Login Tradizionale (a scomparsa o alternativo) */}
        <details className="group text-neutral-400">
          <summary className="cursor-pointer text-xs text-center hover:text-neutral-300 transition list-none py-1 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Oppure inserisci credenziali manuali</span>
          </summary>
          <Card className="mt-3 bg-neutral-900 border-neutral-800">
            <CardContent className="pt-4 space-y-3">
              <form onSubmit={handleStandardSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-300">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@demo.local"
                    className="bg-neutral-950 border-neutral-800 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-300">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-neutral-950 border-neutral-800 text-sm mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
                >
                  Accedi
                </Button>
              </form>
            </CardContent>
          </Card>
        </details>

        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-red-950/50 border border-red-800 text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Nota Sicurezza per colloquio */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 text-center">
          <Shield className="w-3.5 h-3.5 text-neutral-400" />
          <span>Autenticazione gestita con Supabase Auth & JWT</span>
        </div>
      </div>
    </div>
  )
}
