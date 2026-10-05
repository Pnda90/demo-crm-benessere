# 🌿 DEMO CRM Benessere

[![Live Demo](https://img.shields.io/badge/Live%20Demo-demo--crm--benessere.vercel.app-22c55e?style=for-the-badge&logo=vercel)](https://demo-crm-benessere.vercel.app/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React%2019-Vite-61dafb?style=for-the-badge&logo=react)](https://react.dev)

> 🚀 **Live Demo**: [https://demo-crm-benessere.vercel.app/](https://demo-crm-benessere.vercel.app/)  
> **Mini-CRM full-stack mobile-first per la gestione di centri benessere e spa.**  
> Progettato con architettura cloud sicura, database PostgreSQL con Row Level Security (RLS) a due livelli, pagamenti Stripe automatizzati e assistente AI integrato tramite serverless Edge Functions.

---

## 🎯 Panoramica del Progetto
DEMO CRM Benessere è un prototipo funzionale che simula i flussi commerciali e operativi di una struttura benessere:
1. **Gestione Clienti & Contratti**: tracciamento degli abbonamenti con monitoraggio automatico delle scadenze nei successivi 30 giorni.
2. **Calcolo Provvigionale Automatizzato**: generazione e storno delle provvigioni per gli agenti commerciali gestite a livello database tramite trigger PostgreSQL.
3. **Pagamenti Digitali (Stripe Sandbox)**: flusso di checkout e riconciliazione webhook integrati su Edge Functions Deno.
4. **Assistente AI Specializzato**: consulente commerciale basato su LLM (Google Gemini Flash / Anthropic Claude), con iniezione di contesto delimitata dalle policy RLS e architettura Zero-Trust.
5. **Segregazione dei Ruoli**:
   * **`Admin`**: visibilità globale e governo su clienti, contratti e compensi della rete commerciale.
   * **`Agente`**: accesso strettamente limitato ai propri clienti, contratti e provvigioni personali.
   * **`Operatore`**: consultazione di anagrafica e scadenze per l'accoglienza in reception, con **accesso escluso ai dati economici e provvigionali**.

---

## 🛠️ Stack Tecnologico

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com)
* **PWA**: `vite-plugin-pwa` (installabile come app standalone, layout mobile-first)
* **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL 15, Auth JWT, Row Level Security, Edge Functions)
* **Pagamenti**: Stripe API (Test Mode Checkout + Webhook)
* **Motore AI**: Google Gemini API (`gemini-3.8-flash`) con supporto alternativo ad Anthropic Claude 3.5 Sonnet

---

## 🔐 Architettura di Sicurezza & Best Practices

| Principio | Dettaglio Implementativo |
|---|---|
| **Zero Secrets on Client** | Nessuna chiave privata (Stripe secret, API key AI, service role) risiede nel codice frontend o nel repository. Il client interagisce unicamente con variabili pubbliche e token JWT. |
| **Doppio Livello di Sicurezza DB** | 1. **GRANT espliciti**: permessi di tabella concessi unicamente al ruolo `authenticated` (il ruolo `anon` ha zero accesso).<br>2. **Row Level Security (RLS)**: policy dichiarative attive su tutte le tabelle per circoscrivere l'accesso riga per riga in base a `ruolo` e `auth.uid()`. |
| **Logiche di Business nel Backend** | I calcoli finanziari (percentuali di provvigione, eliminazione su rimborso) risiedono in funzioni e trigger Postgres in schema isolato, rendendo impossibile la manomissione dal frontend. |
| **Resilienza dell'Assistente AI** | L'Edge Function gestisce la chiamata AI lato server. In caso di picchi di indisponibilità del provider remoto, entra in funzione un fallback automatico basato sulle metriche analitiche reali del database. |

---

## 👥 Credenziali di Accesso per la Prova

Tutti gli account di test utilizzano la password preimpostata: **`DemoCRM2026!`**  
*(Nella schermata di login e nell'header dell'app è disponibile il selettore rapido 1-Click per commutare istantaneamente il ruolo senza digitare credenziali).*

| Ruolo | Email | Nome Profilo | Permessi e Visibilità |
|---|---|---|---|
| **Admin** | `admin@demo.local` | Alessia Admin | Visione d'insieme su tutti i 12 clienti, contratti, statistiche e totale provvigioni di tutti i commerciali. |
| **Agente 1** | `agente1@demo.local` | Marco Agente (10%) | Vede esclusivamente i suoi 5 clienti, i rispettivi contratti e le proprie provvigioni maturate al 10%. |
| **Agente 2** | `agente2@demo.local` | Sara Agente (12%) | Vede esclusivamente i suoi 5 clienti, i rispettivi contratti e le proprie provvigioni maturate al 12%. |
| **Operatore** | `operatore@demo.local` | Luca Operatore | Operatività di reception: anagrafica e ingressi. **La RLS blocca totalmente l'accesso alla tabella provvigioni.** |

---

## 🔍 Come Esplorare l'Applicazione

### 1. Verifica della Segregazione dei Dati (RLS Live)
* Accedendo come **Admin (Alessia)**, la dashboard riporta 12 clienti totali e il monte provvigioni complessivo.
* Cambiando ruolo in **Agente 1 (Marco)** dal menu superiore, il database restituisce solo i 5 clienti di competenza e le sue provvigioni personali.
* Passando a **Operatore (Luca)** e aprendo la scheda *Provvigioni*, l'applicazione visualizza la schermata di accesso negato: la policy Postgres `provvigioni_select` restituisce zero righe al client, impedendo qualunque fuga di dati economici.

### 2. Logiche di Business nel Database
* Il calcolo delle provvigioni è consultabile nella migrazione `supabase/migrations/20261005130000_logiche_business.sql`.
* All'incasso di un pagamento, il trigger Postgres risale automaticamente all'agente assegnato al cliente e alla sua percentuale, salvando il record in modo idempotente.

### 3. Rinnovi e Pagamenti Stripe
* Nella schermata **Rinnovi in Scadenza**, i contratti imminenti sono calcolati dalla vista SQL protetta `rinnovi_in_scadenza` (`security_invoker = true`).
* Il pulsante **Paga con Stripe (Test)** avvia la creazione della sessione di pagamento tramite Edge Function e ne gestisce la conferma via webhook.

### 4. Assistente AI Contestualizzato
* Nella sezione **Assistente AI** sono disponibili domande rapide per testare il motore di analisi (es. sintesi dei contratti a rischio abbandono, strategie promozionali di rinnovo).
* L'Edge Function riceve il JWT dell'utente, interroga il database nel suo specifico perimetro e inoltra il contesto all'AI.

---

## 🧪 Suite di Test Automatici

L'integrità delle regole di sicurezza e dei flussi serverless può essere verificata tramite gli script inclusi:

```bash
# Verifica permessi GRANT e Row Level Security per ciascun ruolo
npm run test:rls

# Verifica trigger provvigioni e vista rinnovi protetta
npm run test:fase2

# Verifica Edge Functions Stripe e simulazione webhook
npm run test:fase4

# Verifica Edge Function Assistente AI e iniezione contesto protetto
npm run test:fase5

# Build di produzione e typecheck TypeScript
npm run build
```

---

## 🚀 Avvio Locale

```bash
# 1. Installazione dipendenze
npm install

# 2. Avvio del server di sviluppo (http://localhost:5173)
npm run dev
```

---

## 📁 Struttura del Progetto

```text
├── src/
│   ├── components/
│   │   ├── layout/AppLayout.tsx     # Layout mobile-first e selettore rapido ruoli
│   │   ├── views/
│   │   │   ├── DashboardView.tsx    # Cruscotto KPI con dati filtrati via RLS
│   │   │   ├── ClientiView.tsx      # Anagrafica clienti con ricerca e contratti
│   │   │   ├── RinnoviView.tsx      # Contratti in scadenza e checkout Stripe
│   │   │   ├── ProvvigioniView.tsx  # Compensi commerciali o blocco RLS
│   │   │   ├── AssistenteView.tsx   # Chat AI interattiva (Gemini/Claude)
│   │   │   └── LoginView.tsx        # Schermata di accesso e switch rapido demo
│   │   └── ui/                      # Libreria componenti shadcn/ui
│   ├── context/AuthContext.tsx      # Gestione sessione e profili Supabase Auth
│   ├── lib/supabase.ts              # Client Supabase con chiave pubblica
│   └── types/database.ts            # Modelli di dati TypeScript
├── supabase/
│   ├── migrations/                  # Schema Postgres, RLS, GRANT e Trigger
│   ├── seed.sql                     # Dataset dimostrativo fittizio
│   └── functions/
│       ├── crea-checkout-stripe/    # Edge Function per Stripe Checkout
│       ├── stripe-webhook/          # Edge Function per Webhook Stripe
│       └── assistente-ai/           # Edge Function per integrazione AI
└── scripts/                         # Test suite end-to-end (RLS, business logic, Edge Functions)
```
