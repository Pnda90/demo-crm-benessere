-- =============================================================================
-- DEMO CRM Benessere — Fase 1: schema, ruoli, GRANT e Row Level Security
-- =============================================================================
-- Modello di sicurezza a DUE livelli:
--   1) GRANT  -> quale ruolo Postgres può toccare una tabella (anon: nulla).
--   2) RLS    -> quali RIGHE vede/modifica l'utente loggato, in base al suo
--                ruolo applicativo (admin / agente / operatore) in "profili".
-- Nessuna policy usa "using (true)".
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Schema "privato": contiene funzioni di supporto.
-- NON è esposto dalla Data API (che espone solo "public"), quindi queste
-- funzioni non sono richiamabili come RPC dal browser.
-- -----------------------------------------------------------------------------
create schema if not exists privato;


-- -----------------------------------------------------------------------------
-- TABELLE
-- -----------------------------------------------------------------------------

-- Profilo applicativo di ogni utente di Supabase Auth.
-- Nessun profilo = nessun ruolo = nessun dato visibile (deny by default).
create table public.profili (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  ruolo text not null check (ruolo in ('admin', 'agente', 'operatore')),
  -- Percentuale di provvigione dell'agente (usata in Fase 2). 0 per gli altri ruoli.
  percentuale_provvigione numeric(5, 2) not null default 0
    check (percentuale_provvigione between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.clienti (
  id bigint generated always as identity primary key,
  nome text not null,
  email text unique,
  telefono text,
  note text,
  -- Agente commerciale che "possiede" il cliente (può essere vuoto).
  agente_id uuid references public.profili (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Un abbonamento è il "contratto" del cliente.
create table public.abbonamenti (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clienti (id) on delete cascade,
  piano text not null,                          -- es. "Mensile", "Annuale Spa"
  prezzo numeric(10, 2) not null check (prezzo >= 0),
  data_inizio date not null,
  data_fine date not null,
  stato text not null default 'attivo'
    check (stato in ('attivo', 'scaduto', 'annullato')),
  created_at timestamptz not null default now(),
  check (data_fine >= data_inizio)
);

create table public.pagamenti (
  id bigint generated always as identity primary key,
  abbonamento_id bigint not null references public.abbonamenti (id) on delete cascade,
  importo numeric(10, 2) not null check (importo >= 0),
  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'pagato', 'fallito', 'rimborsato')),
  stripe_session_id text unique,                -- valorizzato dal webhook Stripe (Fase 4)
  pagato_il timestamptz,
  created_at timestamptz not null default now()
);

-- Una provvigione per ogni pagamento incassato (logica di calcolo in Fase 2).
create table public.provvigioni (
  id bigint generated always as identity primary key,
  agente_id uuid not null references public.profili (id) on delete cascade,
  pagamento_id bigint not null unique references public.pagamenti (id) on delete cascade,
  importo numeric(10, 2) not null check (importo >= 0),
  created_at timestamptz not null default now()
);

-- Indici sulle chiavi esterne: servono anche alle policy RLS che filtrano per agente.
create index on public.clienti (agente_id);
create index on public.abbonamenti (cliente_id);
create index on public.pagamenti (abbonamento_id);
create index on public.provvigioni (agente_id);


-- -----------------------------------------------------------------------------
-- FUNZIONI DI SUPPORTO PER LE POLICY
-- -----------------------------------------------------------------------------

-- Restituisce il ruolo dell'utente loggato (null se non ha un profilo).
-- "security definer": legge "profili" ignorando la RLS. Senza questo, una
-- policy su "profili" che interroga "profili" andrebbe in ricorsione infinita.
-- "search_path = ''" impedisce di dirottare la funzione con oggetti omonimi.
create function privato.ruolo_corrente()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ruolo from public.profili where id = auth.uid()
$$;

-- Il cliente indicato appartiene all'agente loggato?
-- Usata dalle policy di abbonamenti e pagamenti.
create function privato.e_mio_cliente(p_cliente_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clienti
    where id = p_cliente_id and agente_id = auth.uid()
  )
$$;

-- Trigger: solo un admin può spostare un cliente da un agente a un altro
-- (cambiare agente_id sposterebbe anche le provvigioni future).
create function privato.blocca_riassegnazione_cliente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agente_id is distinct from old.agente_id
     and privato.ruolo_corrente() is distinct from 'admin' then
    raise exception 'Solo un admin può riassegnare un cliente a un altro agente';
  end if;
  return new;
end;
$$;

create trigger clienti_blocca_riassegnazione
before update on public.clienti
for each row execute function privato.blocca_riassegnazione_cliente();


-- -----------------------------------------------------------------------------
-- LIVELLO 1: GRANT
-- -----------------------------------------------------------------------------
-- Partiamo da zero: nessun privilegio per anon (non loggato) e authenticated.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema privato from public, anon, authenticated;

-- Gli utenti loggati possono usare lo schema privato solo per eseguire
-- le funzioni chiamate dalle policy.
grant usage on schema privato to authenticated;
grant execute on function privato.ruolo_corrente() to authenticated;
grant execute on function privato.e_mio_cliente(bigint) to authenticated;

-- Privilegi di tabella SOLO a "authenticated". Quali righe: lo decide la RLS.
grant select, insert, update, delete on public.profili     to authenticated;
grant select, insert, update, delete on public.clienti     to authenticated;
grant select, insert, update, delete on public.abbonamenti to authenticated;
grant select, insert, update, delete on public.pagamenti   to authenticated;
grant select, insert, update, delete on public.provvigioni to authenticated;


-- -----------------------------------------------------------------------------
-- LIVELLO 2: ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- Con la RLS attiva e nessuna policy applicabile, il risultato è "nessuna riga".
-- Nota: "(select privato.ruolo_corrente())" tra parentesi fa calcolare il ruolo
-- una sola volta per query invece che per ogni riga (più veloce).
alter table public.profili     enable row level security;
alter table public.clienti     enable row level security;
alter table public.abbonamenti enable row level security;
alter table public.pagamenti   enable row level security;
alter table public.provvigioni enable row level security;


-- ---------- PROFILI ----------
-- Ognuno vede il proprio profilo; l'admin vede tutti.
create policy profili_select on public.profili
  for select to authenticated
  using (id = (select auth.uid()) or (select privato.ruolo_corrente()) = 'admin');

-- Solo l'admin crea/modifica/elimina profili.
-- Quindi nessuno può promuoversi da solo ad admin o alzarsi la provvigione.
create policy profili_insert on public.profili
  for insert to authenticated
  with check ((select privato.ruolo_corrente()) = 'admin');

create policy profili_update on public.profili
  for update to authenticated
  using ((select privato.ruolo_corrente()) = 'admin')
  with check ((select privato.ruolo_corrente()) = 'admin');

create policy profili_delete on public.profili
  for delete to authenticated
  using ((select privato.ruolo_corrente()) = 'admin');


-- ---------- CLIENTI ----------
-- admin e operatore vedono tutti i clienti; l'agente solo i propri.
create policy clienti_select on public.clienti
  for select to authenticated
  using (
    (select privato.ruolo_corrente()) in ('admin', 'operatore')
    or agente_id = (select auth.uid())
  );

-- L'agente può creare clienti solo assegnandoli a sé stesso.
create policy clienti_insert on public.clienti
  for insert to authenticated
  with check (
    (select privato.ruolo_corrente()) in ('admin', 'operatore')
    or ((select privato.ruolo_corrente()) = 'agente' and agente_id = (select auth.uid()))
  );

-- "using" = quali righe può toccare; "with check" = come devono essere dopo.
-- (Il cambio di agente è comunque bloccato dal trigger per i non-admin.)
create policy clienti_update on public.clienti
  for update to authenticated
  using (
    (select privato.ruolo_corrente()) in ('admin', 'operatore')
    or ((select privato.ruolo_corrente()) = 'agente' and agente_id = (select auth.uid()))
  )
  with check (
    (select privato.ruolo_corrente()) in ('admin', 'operatore')
    or ((select privato.ruolo_corrente()) = 'agente' and agente_id = (select auth.uid()))
  );

-- Cancellare un cliente elimina anche abbonamenti e pagamenti: solo admin.
create policy clienti_delete on public.clienti
  for delete to authenticated
  using ((select privato.ruolo_corrente()) = 'admin');


-- ---------- ABBONAMENTI (contratti) ----------
-- admin e operatore leggono tutto; l'agente solo i contratti dei propri clienti.
create policy abbonamenti_select on public.abbonamenti
  for select to authenticated
  using (
    (select privato.ruolo_corrente()) in ('admin', 'operatore')
    or ((select privato.ruolo_corrente()) = 'agente' and privato.e_mio_cliente(cliente_id))
  );

-- Creare/modificare contratti: admin, oppure l'agente sui propri clienti.
-- L'operatore ha sola lettura.
create policy abbonamenti_insert on public.abbonamenti
  for insert to authenticated
  with check (
    (select privato.ruolo_corrente()) = 'admin'
    or ((select privato.ruolo_corrente()) = 'agente' and privato.e_mio_cliente(cliente_id))
  );

create policy abbonamenti_update on public.abbonamenti
  for update to authenticated
  using (
    (select privato.ruolo_corrente()) = 'admin'
    or ((select privato.ruolo_corrente()) = 'agente' and privato.e_mio_cliente(cliente_id))
  )
  with check (
    (select privato.ruolo_corrente()) = 'admin'
    or ((select privato.ruolo_corrente()) = 'agente' and privato.e_mio_cliente(cliente_id))
  );

create policy abbonamenti_delete on public.abbonamenti
  for delete to authenticated
  using ((select privato.ruolo_corrente()) = 'admin');


-- ---------- PAGAMENTI ----------
-- Lettura: admin e operatore tutto; agente solo i pagamenti dei propri clienti.
create policy pagamenti_select on public.pagamenti
  for select to authenticated
  using (
    (select privato.ruolo_corrente()) in ('admin', 'operatore')
    or (
      (select privato.ruolo_corrente()) = 'agente'
      and exists (
        select 1 from public.abbonamenti a
        where a.id = abbonamento_id and privato.e_mio_cliente(a.cliente_id)
      )
    )
  );

-- Scrittura manuale: solo admin. In produzione i pagamenti li registra il
-- webhook Stripe (Fase 4) lato server, con la service_role che bypassa la RLS.
create policy pagamenti_insert on public.pagamenti
  for insert to authenticated
  with check ((select privato.ruolo_corrente()) = 'admin');

create policy pagamenti_update on public.pagamenti
  for update to authenticated
  using ((select privato.ruolo_corrente()) = 'admin')
  with check ((select privato.ruolo_corrente()) = 'admin');

create policy pagamenti_delete on public.pagamenti
  for delete to authenticated
  using ((select privato.ruolo_corrente()) = 'admin');


-- ---------- PROVVIGIONI ----------
-- admin vede tutto; l'agente solo le proprie; l'operatore NON ha alcuna policy
-- di lettura che lo includa, quindi riceve sempre zero righe.
create policy provvigioni_select on public.provvigioni
  for select to authenticated
  using (
    (select privato.ruolo_corrente()) = 'admin'
    or ((select privato.ruolo_corrente()) = 'agente' and agente_id = (select auth.uid()))
  );

-- Scrittura manuale solo admin (il calcolo automatico arriva in Fase 2).
create policy provvigioni_insert on public.provvigioni
  for insert to authenticated
  with check ((select privato.ruolo_corrente()) = 'admin');

create policy provvigioni_update on public.provvigioni
  for update to authenticated
  using ((select privato.ruolo_corrente()) = 'admin')
  with check ((select privato.ruolo_corrente()) = 'admin');

create policy provvigioni_delete on public.provvigioni
  for delete to authenticated
  using ((select privato.ruolo_corrente()) = 'admin');
