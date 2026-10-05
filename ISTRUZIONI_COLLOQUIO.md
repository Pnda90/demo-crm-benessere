# 🎯 Guida Personale per il Colloquio — DEMO CRM Benessere

> **Questo file contiene i tuoi appunti riservati per superare brillantemente il colloquio come sviluppatore CRM con competenze AI.**  
> Conservalo per prepararti prima della demo o tienilo aperto su uno schermo secondario durante il colloquio.

---

## ⏰ Checklist 10 Minuti Prima del Colloquio

1. **Verifica Progetto Supabase**:
   * Accedi a [supabase.com](https://supabase.com/dashboard).
   * Controlla che il progetto non sia in pausa (se è in pausa per inattività gratuita, basta un clic su **"Restore"** e torna attivo in 60 secondi).
2. **Avvia il Frontend in Locale** (o apri il link online se deployato):
   ```bash
   cd ~/Desktop/Gianluca/Progetti/"DEMO CRM Benessere"
   npm run dev
   ```
   Apri `http://localhost:5173` sul browser a tutto schermo o in modalità responsive per smartphone (tasto `F12` → icona dispositivo mobile).
3. **Credenziali a portata di mano**:
   * Password valida per tutti gli account: **`DemoCRM2026!`**

---

## 🎬 Scaletta Dimostrativa Live (3-4 Minuti)

Segui esattamente questo ordine: ha un impatto visivo immediato e dimostra tutte le competenze chiave richieste dall'annuncio.

### Tappa 1: Login Rapido & Panoramica (30 secondi)
* **Cosa fare**:
  * Apri la pagina iniziale di login.
  * Mostra il blocco **"Accesso Rapido Demo (1-Click)"**. Clicca su **Admin (Alessia)**.
* **Cosa dire**:
  > *"Ho progettato l'applicazione per un centro benessere con ruoli aziendali distinti. L'amministratore ha una visione globale: qui nella dashboard vediamo tutti i 12 clienti gestiti nel centro, i contratti attivi e il monte provvigionale complessivo generato dalla rete commerciale."*

---

### Tappa 2: Il Cambio Ruolo e la Segregazione Dati RLS (60 secondi)
* **Cosa fare**:
  * In alto a destra, clicca sul menu a tendina del profilo e seleziona **Agente 1 (Marco)**.
  * Mostra la dashboard: i clienti scendono immediatamente da 12 a **5**, e compaiono solo le provvigioni maturate da Marco con percentuale al **10%**.
  * Spostati nella scheda **Clienti**: dimostra che sono presenti solo i clienti a lui assegnati.
* **Cosa dire**:
  > *"Ora sono loggato come commerciale. Notate che il frontend non fa alcun filtraggio cosmetico con `array.filter()`: è direttamente PostgreSQL che, tramite Row Level Security, non invia al client le righe appartenenti ad altri colleghi."*

---

### Tappa 3: La Dimostrazione di Sicurezza sull'Operatore (45 secondi)
* **Cosa fare**:
  * Dal menu in alto cambia ruolo in **Operatore (Luca)**.
  * Mostra la dashboard: l'operatore di reception vede i 12 clienti per accogliere le persone all'ingresso.
  * Clicca sulla scheda **Provvigioni**: compare la schermata di blocco di sicurezza.
* **Cosa dire**:
  > *"L'operatore deve poter accogliere i clienti, ma non deve avere accesso ai dati retributivi e alle provvigioni dei venditori. Se un operatore apre la sezione provvigioni o invia una chiamata API manuale con il proprio token JWT, PostgreSQL applica la policy `provvigioni_select` e restituisce esattamente zero righe. Nessun dato economico esce dal server."*

---

### Tappa 4: Rinnovi e Pagamento Stripe in Test Mode (45 secondi)
* **Cosa fare**:
  * Clicca sulla scheda **Rinnovi in Scadenza**.
  * Mostra i badge di allerta calcolati sui giorni rimanenti (`< 5gg` in rosso, `< 15gg` in arancione).
  * Mostra il pulsante **"Paga con Stripe (Test)"**.
* **Cosa dire**:
  > *"La vista SQL `rinnovi_in_scadenza` calcola in tempo reale i giorni mancanti, ereditando la RLS tramite `security_invoker`. Quando un commerciale vuole rinnovare un cliente, il pulsante chiama un'Edge Function Deno che crea una sessione Stripe Checkout in test mode. Al pagamento, il webhook riceve la conferma e fa scattare un trigger PostgreSQL che accredita in automatico la provvigione all'agente."*

---

### Tappa 5: L'Assistente AI Commerciale (60 secondi)
* **Cosa fare**:
  * Clicca sulla scheda **Assistente AI**.
  * Clicca su uno dei prompt rapidi consigliati (es. *"Quali rinnovi sono più urgenti questa settimana?"*).
  * Mostra la risposta generata e il badge del modello.
* **Cosa dire**:
  > *"Infine, l'assistente AI: l'architettura è rigorosamente Zero-Trust. Nessuna chiave API di Claude o Google Gemini risiede nel browser. Il client invia il token JWT a un'Edge Function; la funzione estrae dal database solo i clienti consentiti dalla RLS per quell'utente specifico e passa il contesto all'LLM. Inoltre, ho implementato un fallback resiliente sui dati analitici del DB per garantire il 100% di uptime anche in caso di picchi del provider AI."*

---

## 💡 Le 5 Domande Tecniche Probabili & Risposte Perfette

### 1. *"Perché hai usato Supabase e RLS invece di creare un backend custom con Express o NestJS?"*
* **Risposta vincente**:
  > *"Perché spostare la sicurezza a livello database con RLS e GRANT garantisce che nessun bug nel layer applicativo o nell'ORM possa provocare una fuga di dati (data breach). Con un backend tradizionale bastano una clausola `WHERE` dimenticata o un endpoint mal protetto per esporre dati sensibili. Con RLS, ogni query SQL eseguita con il contesto utente è vincolata all'origine da PostgreSQL."*

### 2. *"Cosa impedisce a un utente di bypassare il frontend e chiamare direttamente le API di Supabase?"*
* **Risposta vincente**:
  > *"Niente, ed è proprio questo il punto forte dell'architettura: un utente malintenzionato può aprire Postman o cURL e interrogare direttamente gli endpoint REST con la chiave pubblica e il proprio JWT. Anche facendolo, PostgreSQL applica la RLS e restituisce solo i suoi dati. Inoltre, abbiamo revocato tutti i GRANT al ruolo `anon`, quindi un utente non autenticato riceve immediatamente `permission denied`."*

### 3. *"Perché calcolare le provvigioni in un trigger Postgres anziché nel frontend o in Node.js?"*
* **Risposta vincente**:
  > *"Regola fondamentale di business logic: la finanza e i compensi non si fidano mai del client. Un calcolo nel frontend può essere manomesso tramite DevTools o falsificato nelle chiamate API. Con un trigger PostgreSQL su `pagamenti`, l'accredito della provvigione avviene in transazione atomica nel momento esatto in cui lo stato diventa `pagato`, ed è gestito anche lo storno automatico in caso di rimborso (`rimborsato`)."*

### 4. *"Come gestisci l'idempotenza e la sicurezza del Webhook di Stripe?"*
* **Risposta vincente**:
  > *"L'Edge Function di webhook riceve l'evento con firma crittografica `stripe-signature` verificata tramite il webhook secret. L'aggiornamento avviene sul campo univoco `stripe_session_id`. Se Stripe reinvia lo stesso webhook più volte per retry di rete, l'aggiornamento è idempotente e il trigger PostgreSQL usa `ON CONFLICT (pagamento_id) DO UPDATE`, evitando di duplicare provvigioni."*

### 5. *"Come hai integrato l'AI rispettando la privacy e la sicurezza?"*
* **Risposta vincente**:
  > *"Attraverso tre livelli: primo, architettura serverless (le chiavi API vivono solo nei secrets del server). Secondo, minimizzazione dei dati: all'AI non viene inviato l'intero database, ma solo un estratto sintetico dei clienti del commerciale chiamante. Terzo, astrazione del provider: l'Edge Function supporta sia Google Gemini Flash che Anthropic Claude 3.5 Sonnet tramite variabili d'ambiente, rendendo il CRM indipendente da un singolo vendor di intelligenza artificiale."*

---

## 📂 I "Pezzi Forti" del Codice da Mostrare se Chiedono di Vedere i File

Se l'intervistatore dice *"Fammi vedere il codice"*, apri questi file nell'editor:

1. **La Sicurezza (Doppio Livello)**:
   * File: `supabase/migrations/20261005120000_schema_iniziale.sql`
   * Mostra i `revoke all`, i `grant` selettivi a `authenticated` e le policy RLS con funzioni `security definer` nello schema `privato` (spiega che isolare le funzioni in `privato` impedisce che vengano chiamate come RPC dal browser).
2. **La Business Logic nel Database**:
   * File: `supabase/migrations/20261005130000_logiche_business.sql`
   * Mostra il trigger `privato.calcola_provvigione()` e la vista `rinnovi_in_scadenza` con `security_invoker = true`.
3. **L'Edge Function dell'Assistente AI**:
   * File: `supabase/functions/assistente-ai/index.ts`
   * Mostra la verifica del JWT, l'estrazione dei clienti e la gestione flessibile del provider (Gemini / Claude / Fallback).
4. **I Test Automatici**:
   * Nel terminale puoi lanciare:
     ```bash
     npm run test:rls
     ```
     Mostrare **25 test verdi che tentano accessi non autorizzati e falliscono come previsto** è la prova più convincente per un ruolo senior.
