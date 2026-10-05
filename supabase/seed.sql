-- =============================================================================
-- DEMO CRM Benessere — Dati di esempio (TUTTI FITTIZI)
-- =============================================================================
-- Rieseguibile: cancella e ricrea solo i dati demo.
-- Password comune per tutti gli utenti demo: DemoCRM2026!
-- (account di prova senza alcun valore: va bene che sia scritta qui)
-- =============================================================================

-- Pulizia dati demo precedenti
truncate public.provvigioni, public.pagamenti, public.abbonamenti, public.clienti
  restart identity cascade;
delete from auth.users where email like '%@demo.local';  -- cascata su identities e profili


-- -----------------------------------------------------------------------------
-- Utenti Auth (inserimento diretto: è il modo standard per i seed Supabase)
-- -----------------------------------------------------------------------------
-- UUID fissi per poterli riconoscere facilmente nei test.
with utenti(id, email, nome) as (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@demo.local',     'Alessia Admin'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'agente1@demo.local',   'Marco Agente'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'agente2@demo.local',   'Sara Agente'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'operatore@demo.local', 'Luca Operatore')
),
ins_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    -- GoTrue si aspetta stringhe vuote (non NULL) in questi campi
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('DemoCRM2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', nome),
    now(), now(), '', '', '', ''
  from utenti
  returning id, email
)
-- Identità "email": necessaria per il login con email e password
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from ins_users;


-- -----------------------------------------------------------------------------
-- Profili applicativi (ruoli)
-- -----------------------------------------------------------------------------
insert into public.profili (id, nome, ruolo, percentuale_provvigione) values
  ('a0000000-0000-4000-8000-000000000001', 'Alessia Admin',  'admin',     0),
  ('a0000000-0000-4000-8000-000000000002', 'Marco Agente',   'agente',    10),
  ('a0000000-0000-4000-8000-000000000003', 'Sara Agente',    'agente',    12),
  ('a0000000-0000-4000-8000-000000000004', 'Luca Operatore', 'operatore', 0);


-- -----------------------------------------------------------------------------
-- Clienti (nomi inventati, email su dominio .example riservato ai test)
-- agente1 = 5 clienti, agente2 = 5 clienti, 2 senza agente
-- -----------------------------------------------------------------------------
insert into public.clienti (nome, email, telefono, agente_id) values
  ('Giulia Fittizi',    'giulia.fittizi@cliente.example',    '+39 000 0000001', 'a0000000-0000-4000-8000-000000000002'),
  ('Paolo Prova',       'paolo.prova@cliente.example',       '+39 000 0000002', 'a0000000-0000-4000-8000-000000000002'),
  ('Elena Esempio',     'elena.esempio@cliente.example',     '+39 000 0000003', 'a0000000-0000-4000-8000-000000000002'),
  ('Davide Demo',       'davide.demo@cliente.example',       '+39 000 0000004', 'a0000000-0000-4000-8000-000000000002'),
  ('Chiara Campione',   'chiara.campione@cliente.example',   '+39 000 0000005', 'a0000000-0000-4000-8000-000000000002'),
  ('Roberto Test',      'roberto.test@cliente.example',      '+39 000 0000006', 'a0000000-0000-4000-8000-000000000003'),
  ('Martina Modello',   'martina.modello@cliente.example',   '+39 000 0000007', 'a0000000-0000-4000-8000-000000000003'),
  ('Stefano Simulato',  'stefano.simulato@cliente.example',  '+39 000 0000008', 'a0000000-0000-4000-8000-000000000003'),
  ('Francesca Finta',   'francesca.finta@cliente.example',   '+39 000 0000009', 'a0000000-0000-4000-8000-000000000003'),
  ('Andrea Anonimo',    'andrea.anonimo@cliente.example',    '+39 000 0000010', 'a0000000-0000-4000-8000-000000000003'),
  ('Valentina Vuota',   'valentina.vuota@cliente.example',   '+39 000 0000011', null),
  ('Simone Segnaposto', 'simone.segnaposto@cliente.example', '+39 000 0000012', null);


-- -----------------------------------------------------------------------------
-- Abbonamenti: date relative a oggi, così "in scadenza" resta sempre valido.
-- -----------------------------------------------------------------------------
insert into public.abbonamenti (cliente_id, piano, prezzo, data_inizio, data_fine, stato)
select c.id, v.piano, v.prezzo, current_date + v.inizio, current_date + v.fine, v.stato
from (values
  ('giulia.fittizi@cliente.example',    'Mensile',       59.00,  -25,    5, 'attivo'),   -- scade tra 5 gg
  ('paolo.prova@cliente.example',       'Annuale',      490.00, -300,   65, 'attivo'),
  ('elena.esempio@cliente.example',     'Trimestrale',  159.00,  -80,   10, 'attivo'),   -- scade tra 10 gg
  ('davide.demo@cliente.example',       'Mensile',       59.00,  -40,  -10, 'scaduto'),
  ('chiara.campione@cliente.example',   'Annuale Spa',  790.00, -100,  265, 'attivo'),
  ('roberto.test@cliente.example',      'Mensile',       59.00,  -28,    2, 'attivo'),   -- scade tra 2 gg
  ('martina.modello@cliente.example',   'Trimestrale',  159.00,  -60,   30, 'attivo'),
  ('stefano.simulato@cliente.example',  'Annuale',      490.00, -200,  165, 'attivo'),
  ('francesca.finta@cliente.example',   'Mensile',       59.00,  -15,   15, 'attivo'),
  ('andrea.anonimo@cliente.example',    'Mensile',       59.00,  -90,  -60, 'annullato'),
  ('valentina.vuota@cliente.example',   'Trimestrale',  159.00,  -85,    5, 'attivo'),   -- scade tra 5 gg
  ('simone.segnaposto@cliente.example', 'Annuale Spa',  790.00,  -10,  355, 'attivo')
) as v(email, piano, prezzo, inizio, fine, stato)
join public.clienti c on c.email = v.email;


-- -----------------------------------------------------------------------------
-- Pagamenti: un pagamento "pagato" per ogni abbonamento non annullato.
-- -----------------------------------------------------------------------------
insert into public.pagamenti (abbonamento_id, importo, stato, pagato_il)
select a.id, a.prezzo, 'pagato', a.data_inizio::timestamptz
from public.abbonamenti a
where a.stato <> 'annullato';


-- -----------------------------------------------------------------------------
-- Provvigioni: calcolate qui solo per avere dati demo in Fase 1.
-- In Fase 2 questo calcolo diventerà automatico (trigger nel database).
-- -----------------------------------------------------------------------------
insert into public.provvigioni (agente_id, pagamento_id, importo)
select p_ag.id, pg.id, round(pg.importo * p_ag.percentuale_provvigione / 100, 2)
from public.pagamenti pg
join public.abbonamenti a on a.id = pg.abbonamento_id
join public.clienti c     on c.id = a.cliente_id
join public.profili p_ag  on p_ag.id = c.agente_id
where pg.stato = 'pagato';
