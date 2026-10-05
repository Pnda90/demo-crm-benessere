import React from 'react'
import { useAuth, DEMO_ACCOUNTS } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CircleDollarSign,
  LogOut,
  ChevronDown,
  Bot
} from 'lucide-react'

export type TabView = 'dashboard' | 'clienti' | 'rinnovi' | 'provvigioni' | 'assistente'

interface AppLayoutProps {
  currentTab: TabView
  onTabChange: (tab: TabView) => void
  children: React.ReactNode
}

export function AppLayout({ currentTab, onTabChange, children }: AppLayoutProps) {
  const { profilo, user, logout, loginDemo, loading } = useAuth()

  const ruolo = profilo?.ruolo ?? 'operatore'

  const getBadgeColor = () => {
    switch (ruolo) {
      case 'admin':
        return 'border-purple-500/40 text-purple-400 bg-purple-500/10'
      case 'agente':
        return 'border-blue-500/40 text-blue-400 bg-blue-500/10'
      case 'operatore':
        return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-16 md:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            CB
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
              <span>CRM Benessere</span>
              <span className="text-[10px] text-neutral-400 font-normal hidden sm:inline">
                | Demo Prototipo
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400">
              {profilo?.nome || user?.email}
            </p>
          </div>
        </div>

        {/* Quick Role Switcher per dimostrazione live al colloquio */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-xs gap-1.5 px-2.5"
              >
                <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 ${getBadgeColor()}`}>
                  {ruolo}
                </Badge>
                {ruolo === 'agente' && (
                  <span className="text-[11px] text-neutral-400">
                    ({profilo?.percentuale_provvigione}%)
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 w-60">
              <DropdownMenuLabel className="text-xs text-neutral-400 font-normal">
                Cambia Utente (Test Live RLS)
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-800" />
              {DEMO_ACCOUNTS.map((acc) => (
                <DropdownMenuItem
                  key={acc.email}
                  disabled={loading}
                  onClick={() => loginDemo(acc.email)}
                  className="text-xs cursor-pointer flex flex-col items-start py-2 hover:bg-neutral-800"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-neutral-200">{acc.label}</span>
                    <span className="text-[10px] text-neutral-500 uppercase">{acc.ruolo}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5">{acc.desc}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-xs text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnetti</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="h-8 w-8 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            title="Disconnetti"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Desktop Sub-navigation */}
      <div className="hidden md:flex border-b border-neutral-800 bg-neutral-900/40 px-6 gap-2">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition ${
            currentTab === 'dashboard'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onTabChange('clienti')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition ${
            currentTab === 'clienti'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clienti</span>
        </button>

        <button
          onClick={() => onTabChange('rinnovi')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition ${
            currentTab === 'rinnovi'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Rinnovi in Scadenza</span>
        </button>

        <button
          onClick={() => onTabChange('provvigioni')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition ${
            currentTab === 'provvigioni'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <CircleDollarSign className="w-4 h-4" />
          <span>Provvigioni</span>
          {ruolo === 'operatore' && (
            <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.2 rounded">
              Bloccato
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('assistente')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition ${
            currentTab === 'assistente'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bot className="w-4 h-4 text-emerald-400" />
          <span>Assistente AI</span>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-semibold">
            Fase 5
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-neutral-900/95 backdrop-blur border-t border-neutral-800 flex items-center justify-around py-2 px-1">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
            currentTab === 'dashboard' ? 'text-emerald-400' : 'text-neutral-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onTabChange('clienti')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
            currentTab === 'clienti' ? 'text-emerald-400' : 'text-neutral-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clienti</span>
        </button>

        <button
          onClick={() => onTabChange('rinnovi')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
            currentTab === 'rinnovi' ? 'text-emerald-400' : 'text-neutral-400'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Rinnovi</span>
        </button>

        <button
          onClick={() => onTabChange('provvigioni')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
            currentTab === 'provvigioni' ? 'text-emerald-400' : 'text-neutral-400'
          }`}
        >
          <CircleDollarSign className="w-4 h-4" />
          <span>Provvigioni</span>
        </button>

        <button
          onClick={() => onTabChange('assistente')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
            currentTab === 'assistente' ? 'text-emerald-400' : 'text-neutral-400'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI</span>
        </button>
      </nav>
    </div>
  )
}
