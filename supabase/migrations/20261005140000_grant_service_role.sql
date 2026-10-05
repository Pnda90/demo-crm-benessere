-- =============================================================================
-- DEMO CRM Benessere — Fase 4: Privilegi per il ruolo server "service_role"
-- =============================================================================
-- Le Edge Functions (es. stripe-webhook) si collegano come utente Postgres
-- "service_role" per registrare i pagamenti incassati e bypassare la RLS.
-- Per il principio del minimo privilegio applicato in Fase 1, concediamo
-- ora i GRANT espliciti necessari a service_role.
-- =============================================================================

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant usage on schema privato to service_role;
grant all on all functions in schema privato to service_role;
