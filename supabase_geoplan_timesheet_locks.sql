-- ═══ Verrous mensuels de la feuille de temps GéoPlan ═══
-- 1 ligne par (utilisateur, mois) = mois "validé" (figé, non éditable par le collaborateur).
-- Chacun gère ses verrous ; les superviseurs peuvent lire (et lever) tous les verrous.
-- Dépend de la table geoplan_supervisors. À exécuter dans l'éditeur SQL Supabase.

create table if not exists geoplan_timesheet_locks (
  user_id      uuid not null default auth.uid(),
  mois         text not null,               -- 'YYYY-MM'
  validated_at timestamptz not null default now(),
  validated_by text,
  primary key (user_id, mois)
);

alter table geoplan_timesheet_locks enable row level security;

drop policy if exists "tslock_select" on geoplan_timesheet_locks;
create policy "tslock_select" on geoplan_timesheet_locks for select using (
  auth.uid() = user_id
  or exists (select 1 from geoplan_supervisors s where lower(s.email) = lower(auth.jwt()->>'email'))
);

drop policy if exists "tslock_insert_own" on geoplan_timesheet_locks;
create policy "tslock_insert_own" on geoplan_timesheet_locks for insert with check (auth.uid() = user_id);

-- Suppression (dévalidation) : le propriétaire OU un superviseur
drop policy if exists "tslock_delete" on geoplan_timesheet_locks;
create policy "tslock_delete" on geoplan_timesheet_locks for delete using (
  auth.uid() = user_id
  or exists (select 1 from geoplan_supervisors s where lower(s.email) = lower(auth.jwt()->>'email'))
);
