-- =============================================================================
-- DEMO CRM Benessere — Fase 2: Logiche di business nel DB
-- =============================================================================
-- Regola: Le logiche di calcolo e stato vivono nel database.
-- 1) Trigger automatico calcolo provvigioni su incasso pagamenti (e revoca su rimborso).
-- 2) Vista protetta "rinnovi_in_scadenza" con security_invoker (eredita RLS).
-- 3) Funzione per marcare abbonamenti scaduti.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TRIGGER CALCOLO PROVVIGIONI
-- -----------------------------------------------------------------------------
-- Eseguito con security definer per poter inserire/aggiornare in provvigioni
-- anche se chi ha registrato l'evento (es. webhook) non ha permessi diretti di tabella.
create or replace function privato.calcola_provvigione()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agente_id uuid;
  v_percentuale numeric(5, 2);
  v_importo_provvigione numeric(10, 2);
begin
  -- Caso A: Il pagamento è stato segnato come 'pagato'
  if new.stato = 'pagato' then
    -- Risaliamo all'agente del cliente titolare dell'abbonamento
    select c.agente_id, p.percentuale_provvigione
      into v_agente_id, v_percentuale
      from public.abbonamenti a
      join public.clienti c on c.id = a.cliente_id
      left join public.profili p on p.id = c.agente_id
     where a.id = new.abbonamento_id;

    -- Se c'è un agente assegnato e ha una percentuale > 0, registriamo la provvigione
    if v_agente_id is not null and v_percentuale > 0 then
      v_importo_provvigione := round((new.importo * v_percentuale / 100.0), 2);

      insert into public.provvigioni (agente_id, pagamento_id, importo)
      values (v_agente_id, new.id, v_importo_provvigione)
      on conflict (pagamento_id) do update
        set agente_id = excluded.agente_id,
            importo = excluded.importo;
    else
      -- Se l'agente è stato rimosso o la provvigione è 0, rimuoviamo eventuale riga pregressa
      delete from public.provvigioni where pagamento_id = new.id;
    end if;

  -- Caso B: Il pagamento è stato rimborsato o annullato dopo essere stato pagato
  elsif new.stato in ('rimborsato', 'fallito') and (tg_op = 'UPDATE' and old.stato = 'pagato') then
    delete from public.provvigioni where pagamento_id = new.id;
  end if;

  return new;
end;
$$;

-- Trigger su pagamenti
drop trigger if exists trigger_calcola_provvigione on public.pagamenti;
create trigger trigger_calcola_provvigione
after insert or update on public.pagamenti
for each row execute function privato.calcola_provvigione();


-- -----------------------------------------------------------------------------
-- 2. VISTA RINNOVI IN SCADENZA
-- -----------------------------------------------------------------------------
-- security_invoker = true garantisce che la vista applichi le policy RLS
-- dell'utente che esegue la query:
--   - admin / operatore vedono tutti i clienti in scadenza
--   - agente vede SOLO i propri
create or replace view public.rinnovi_in_scadenza
with (security_invoker = true)
as
select
  a.id as abbonamento_id,
  a.cliente_id,
  c.nome as cliente_nome,
  c.email as cliente_email,
  c.telefono as cliente_telefono,
  c.agente_id,
  a.piano,
  a.prezzo,
  a.data_inizio,
  a.data_fine,
  (a.data_fine - current_date) as giorni_a_scadenza
from public.abbonamenti a
join public.clienti c on c.id = a.cliente_id
where a.stato = 'attivo'
  and a.data_fine between current_date and (current_date + interval '30 days')::date;

-- Permessi sulla vista
grant select on public.rinnovi_in_scadenza to authenticated;


-- -----------------------------------------------------------------------------
-- 3. FUNZIONE DI AGGIORNAMENTO STATI SCADUTI
-- -----------------------------------------------------------------------------
create or replace function privato.marca_abbonamenti_scaduti()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aggiornati integer;
begin
  update public.abbonamenti
     set stato = 'scaduto'
   where stato = 'attivo'
     and data_fine < current_date;

  get diagnostics v_aggiornati = row_count;
  return v_aggiornati;
end;
$$;
