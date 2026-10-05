# 🌿 DEMO CRM Benessere

> **Prototipo dimostrativo full-stack per colloquio tecnico (CRM Developer con competenze AI).**  
> Progettato per essere compatto, sicuro, funzionante e spiegabile riga per riga.

---

## 🎯 Obiettivo di Business
Gestione dei clienti di un centro benessere/spa con:
1. **Contratti e Abbonamenti** con monitoraggio rinnovi a 30 giorni.
2. **Provvigioni commerciali automatiche** calcolate ad ogni incasso reale.
3. **Pagamenti Stripe in Test Mode** gestiti tramite Edge Functions e Webhook.
4. **Assistente AI commerciale** (Google Gemini gratuito / Anthropic Claude) contestualizzato sui dati del centro con architettura Zero-Trust.
5. **Segregazione dei dati garantita da Postgres RLS**:
   * **`admin`**: visibilità e controllo totale su clienti, contratti e compensi.
   * **`agente`**: vede solo i propri clienti, i propri contratti e le proprie provvigioni.
   * **`operatore`**: vede clienti e rinnovi per l'accoglienza in reception, ma **zero accesso ai dati economici**.

---

## 🛠️ Stack Tecnologico
* **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)
* **PWA**: `vite-plugin-pwa` (installabile su smartphone/tablet, mobile-first, standalone)
* **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL 15, Auth JWT, Row Level Security, Edge Functions Deno)
* **Pagamenti**: Stripe API (Test Mode Checkout + Webhook)
* **AI Engine**: Google Gemini API (`gemini-3.8-flash`, gratuito) / Anthropic Claude 3.5 Sonnet

---

## 🔐 Sicurezza & Regole Non Negoziabili

| Regola | Implementazione nel Progetto |
|---|---|
| **Zero chiavi nel frontend** | Solo variabili pubbliche `VITE_SUPABASE_*` in `.env.local` (escluso da Git). Nessuna Secret Key Stripe, Gemini o Claude viaggia nel browser. |
| **Doppio livello di sicurezza** | Livello 1: `GRANT` espliciti solo a `authenticated` (il ruolo `anon` ha zero privilegi).<br>Livello 2: `ENABLE ROW LEVEL SECURITY` su ogni singola tabella, nessuna policy `using (true)`. |
| **Logiche di business nel DB** | Il calcolo provvigionale e lo storno su rimborso vivono in un trigger PostgreSQL, non in codice React o Node. |
| **Resilienza AI** | L'Edge Function esegue un fallback intelligente sui dati analitici del DB se l'API AI remota ha un picco temporaneo o assenza di credenziali. |

---

## 👥 Account Demo Preconfigurati (Seed Fittizio)

Tutti gli account usano la password demo: **`DemoCRM2026!`**  
*(Nella schermata di login o nell'header dell'app è presente il selettore rapido 1-Click per cambiare ruolo istantaneamente).*

| Ruolo | Email | Nome | Cosa vede e può fare |
|---|---|---|---|
| **Admin** | `admin@demo.local` | Alessia Admin | Visualizza tutti i 12 clienti, contratti, statistiche e totale provvigioni di tutti i commerciali. |
| **Agente 1** | `agente1@demo.local` | Marco Agente (10%) | Vede solo i suoi 5 clienti, i suoi 5 contratti e le sue provvigioni maturate al 10%. |
| **Agente 2** | `agente2@demo.local` | Sara Agente (12%) | Vede solo i suoi 5 clienti, i suoi contratti e le sue provvigioni maturate al 12%. |
| **Operatore** | `operatore@demo.local` | Luca Operatore | Receptionist: consulta anagrafica e contratti in arrivo. **Nessun accesso alla tabella provvigioni.** |

---

## 🎤 Script Dimostrativo per il Colloquio (3 Minuti)

Se ti chiedono di mostrare il progetto, segui questi 5 passaggi:

### 1. Mostra la Segregazione dei Dati (RLS Live)
1. Accedi come **Admin (Alessia)**: mostra nella dashboard che i clienti totali sono **12** e le provvigioni sono visibili per l'intera rete.
2. Dal menu in alto cambia in 1 clic a **Agente 1 (Marco)**: la dashboard si aggiorna istantaneamente mostrando **5 clienti** e solo le sue provvigioni personali calcolate al 10%.
3. Cambia a **Operatore (Luca)**: clicca sulla scheda *Provvigioni*. Mostra il badge di blocco e spiega:  
   > *"Non si tratta solo di nascondere un componente in React: la policy Postgres `provvigioni_select` restituisce zero righe al client. Anche manomettendo il frontend, i dati economici non lasciano mai il server."*

### 2. Spiega il Trigger delle Provvigioni
Mostra la migrazione `supabase/migrations/20261005130000_logiche_business.sql`:
> *"Quando un pagamento passa a `stato = 'pagato'`, il trigger `trigger_calcola_provvigione` risale in SQL al cliente e alla percentuale dell'agente assegnato, registrando la provvigione con `ON CONFLICT DO UPDATE`. Se il pagamento viene rimborsato, il trigger elimina la provvigione."*

### 3. Mostra l'Integrazione Stripe in Test Mode
Vai nella vista **Rinnovi in Scadenza**:
1. Mostra i badge di urgenza colorati calcolati in tempo reale dalla vista SQL `rinnovi_in_scadenza` con `security_invoker = true`.
2. Clicca su **"Paga con Stripe (Test)"**: spiega che il client invoca l'Edge Function protetta `crea-checkout-stripe` che genera una sessione Stripe e un record di pagamento `in_attesa`.
3. Il webhook `stripe-webhook` riceve `checkout.session.completed` e marca il pagamento come pagato, scatenando il trigger.

### 4. Dimostra l'Assistente AI
Apri la scheda **Assistente AI**:
1. Clicca uno dei prompt rapidi (es. *"Quali rinnovi sono più urgenti questa settimana?"*).
2. Spiega l'architettura:
   > *"Il browser invia la domanda all'Edge Function con il token JWT. L'Edge Function estrae dal DB solo i clienti dell'utente loggato rispettando la RLS, compone un system prompt specializzato e chiama Google Gemini o Claude. Zero chiavi API esposte sul client."*

---

## 🧪 Esecuzione della Suite di Test

Tutti i test interrogano il database Supabase reale e le Edge Functions:

```bash
# Test 1: Verifica sicurezza GRANT e Row Level Security per tutti i ruoli
npm run test:rls

# Test 2: Verifica trigger automatico provvigioni e vista rinnovi protetta
npm run test:fase2

# Test 3: Verifica sicurezza Edge Functions Stripe e simulazione webhook
npm run test:fase4

# Test 4: Verifica Edge Function Assistente AI e iniezione contesto per ruolo
npm run test:fase5

# Build di produzione e typecheck TypeScript
npm run build
```

---

## 🚀 Avvio Locale del Progetto

```bash
# Installazione dipendenze
npm install

# Avvio server di sviluppo Vite (apri http://localhost:5173)
npm run dev
```

---

## 📁 Struttura del Repository

```text
├── src/
│   ├── components/
│   │   ├── layout/AppLayout.tsx     # Layout mobile-first + role switcher demo
│   │   ├── views/
│   │   │   ├── DashboardView.tsx    # Metriche KPI live con filtro RLS
│   │   │   ├── ClientiView.tsx      # Anagrafica clienti con ricerca e contratti
│   │   │   ├── RinnoviView.tsx      # Rinnovi urgenti + pulsante Stripe Checkout
│   │   │   ├── ProvvigioniView.tsx  # Compensi agenti o schermata RLS negata
│   │   │   ├── AssistenteView.tsx   # Chat AI interattiva (Gemini/Claude)
│   │   │   └── LoginView.tsx        # Login con selettore 1-click account demo
│   │   └── ui/                      # Componenti shadcn/ui (radix + tailwind)
│   ├── context/AuthContext.tsx      # Sessione Supabase Auth & caricamento profili
│   ├── lib/supabase.ts              # Client Supabase con publishable key
│   └── types/database.ts            # Tipi TypeScript delle entità CRM
├── supabase/
│   ├── migrations/                  # Schema Postgres, GRANT, RLS e Trigger
│   ├── seed.sql                     # Dati fittizi riproducibili (4 utenti demo)
│   └── functions/
│       ├── crea-checkout-stripe/    # Edge Function per Stripe Checkout
│       ├── stripe-webhook/          # Edge Function per Webhook Stripe
│       └── assistente-ai/           # Edge Function per Google Gemini / Claude
└── scripts/                         # Script di test end-to-end (fasi 1-5)
```
