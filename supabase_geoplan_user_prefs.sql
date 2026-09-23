-- ═══ Préférences personnelles par utilisateur (GéoPlan) ═══
-- Stocke les réglages propres à chaque personne connectée (ex. configuration des
-- colonnes du tableau Commandes : ordre, largeurs, colonnes masquées ; groupe par
-- défaut ; filtre « mes dossiers »). Suivent la personne sur tous ses appareils.
-- À exécuter dans l'éditeur SQL Supabase.

create table if not exists geoplan_user_prefs (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text,
  prefs       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table geoplan_user_prefs enable row level security;

-- Chacun ne voit et n'écrit QUE sa propre ligne.
drop policy if exists "uprefs_select_own" on geoplan_user_prefs;
create policy "uprefs_select_own" on geoplan_user_prefs for select using (auth.uid() = user_id);

drop policy if exists "uprefs_insert_own" on geoplan_user_prefs;
create policy "uprefs_insert_own" on geoplan_user_prefs for insert with check (auth.uid() = user_id);

drop policy if exists "uprefs_update_own" on geoplan_user_prefs;
create policy "uprefs_update_own" on geoplan_user_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "uprefs_delete_own" on geoplan_user_prefs;
create policy "uprefs_delete_own" on geoplan_user_prefs for delete using (auth.uid() = user_id);
