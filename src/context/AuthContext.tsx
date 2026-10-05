import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profilo, RuoloUtente } from '@/types/database'

export interface DemoAccount {
  label: string
  email: string
  ruolo: RuoloUtente
  desc: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Admin (Alessia)', email: 'admin@demo.local', ruolo: 'admin', desc: 'Vede tutto, gestisce clienti e provvigioni' },
  { label: 'Agente 1 (Marco)', email: 'agente1@demo.local', ruolo: 'agente', desc: 'Vede solo i suoi 5 clienti e provvigioni (10%)' },
  { label: 'Agente 2 (Sara)', email: 'agente2@demo.local', ruolo: 'agente', desc: 'Vede solo i suoi 5 clienti e provvigioni (12%)' },
  { label: 'Operatore (Luca)', email: 'operatore@demo.local', ruolo: 'operatore', desc: 'Vede clienti e rinnovi, ZERO provvigioni' },
]

interface AuthContextType {
  session: Session | null
  user: User | null
  profilo: Profilo | null
  loading: boolean
  loginDemo: (email: string) => Promise<void>
  loginWithCredentials: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profilo, setProfilo] = useState<Profilo | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfilo(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profili')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfilo(data as Profilo)
      } else {
        setProfilo(null)
      }
    } catch {
      setProfilo(null)
    }
  }

  useEffect(() => {
    // 1. Sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfilo(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // 2. Ascolto variazioni di stato auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfilo(session.user.id)
      } else {
        setProfilo(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loginDemo = async (email: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'DemoCRM2026!',
    })
    if (error) {
      setLoading(false)
      throw error
    }
  }

  const loginWithCredentials = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return { error: error.message }
    return {}
  }

  const logout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfilo(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profilo,
        loading,
        loginDemo,
        loginWithCredentials,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider')
  }
  return context
}
