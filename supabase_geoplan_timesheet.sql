-- ═══ Feuille de temps GéoPlan (pointage par collaborateur) ═══
-- Une ligne par (utilisateur, jour, item) où item = une commande OU une activité.
-- RLS : chacun n'édite que SES lignes ; les superviseurs peuvent LIRE toutes les lignes.
-- Dépend de la table geoplan_supervisors (voir supabase_geoplan_supervisors.sql).
-- À exécuter dans l'éditeur SQL Supabase.

create table if not exists geoplan_timesheet (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid(),
  email       text,
  jour        date not null,
  item_key    text not null,                 -- id de commande ou clé activité (ex: act:reunion)
  item_type   text not null default 'commande',  -- 'commande' | 'activite'
  label       text,                          -- libellé affiché (réf/nom affaire ou nom activité)
  commande_id text,                          -- id de la commande liée (si item_type = 'commande')
  heures      numeric(5,2) not null default 0,
  updated_at  timestamptz not null default now(),
  unique (user_id, jour, item_key)
);

create index if not exists idx_geoplan_timesheet_user_month on geoplan_timesheet (user_id, jour);

alter table geoplan_timesheet enable row level security;

drop policy if exists "ts_select_own" on geoplan_timesheet;
drop policy if exists "ts_insert_own" on geoplan_timesheet;
drop policy if exists "ts_update_own" on geoplan_timesheet;
drop policy if exists "ts_delete_own" on geoplan_timesheet;

-- Lecture : propriétaire OU superviseur (pour la vue Suivi d'équipe)
create policy "ts_select_own" on geoplan_timesheet for select using (
  auth.uid() = user_id
  or exists (select 1 from geoplan_supervisors s where lower(s.email) = lower(auth.jwt()->>'email'))
);
-- Écriture : propriétaire uniquement
create policy "ts_insert_own" on geoplan_timesheet for insert with check (auth.uid() = user_id);
create policy "ts_update_own" on geoplan_timesheet for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ts_delete_own" on geoplan_timesheet for delete using (auth.uid() = user_id);
