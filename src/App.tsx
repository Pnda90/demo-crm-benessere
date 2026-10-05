import { useState } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { LoginView } from '@/components/views/LoginView'
import { AppLayout, type TabView } from '@/components/layout/AppLayout'
import { DashboardView } from '@/components/views/DashboardView'
import { ClientiView } from '@/components/views/ClientiView'
import { RinnoviView } from '@/components/views/RinnoviView'
import { ProvvigioniView } from '@/components/views/ProvvigioniView'
import { AssistenteView } from '@/components/views/AssistenteView'

function MainContent() {
  const { session, loading } = useAuth()
  const [currentTab, setCurrentTab] = useState<TabView>('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Caricamento DEMO CRM Benessere...</span>
      </div>
    )
  }

  if (!session) {
    return <LoginView />
  }

  return (
    <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
      {currentTab === 'clienti' && <ClientiView />}
      {currentTab === 'rinnovi' && <RinnoviView />}
      {currentTab === 'provvigioni' && <ProvvigioniView />}
      {currentTab === 'assistente' && <AssistenteView />}
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}
