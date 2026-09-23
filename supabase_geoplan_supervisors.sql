-- ═══ Superviseurs GéoPlan ═══
-- Source unique de vérité pour le rôle "Superviseur" : débloque les vues
-- Suivi d'équipe / Rentabilité / Erreurs-Modifs + le paramétrage étendu.
-- Clé = e-mail (aligné sur l'équipe / settingsTeam).
-- ⚠️ Remplace 'vsalaud@be-gph.fr' par le(s) e-mail(s) admin si besoin.
-- À exécuter dans l'éditeur SQL Supabase.

create table if not exists geoplan_supervisors (
  email      text primary key,
  added_by   text,
  added_at   timestamptz not null default now()
);

alter table geoplan_supervisors enable row level security;

-- Lecture : tout utilisateur authentifié (pour savoir s'il est superviseur + lister côté admin)
drop policy if exists "sup_select_auth" on geoplan_supervisors;
create policy "sup_select_auth" on geoplan_supervisors for select using (auth.role() = 'authenticated');

-- Écriture : réservée à l'admin (par e-mail du JWT)
drop policy if exists "sup_write_admin" on geoplan_supervisors;
create policy "sup_write_admin" on geoplan_supervisors for all
  using (lower(auth.jwt()->>'email') = 'vsalaud@be-gph.fr')
  with check (lower(auth.jwt()->>'email') = 'vsalaud@be-gph.fr');

-- NB : l'élargissement de la lecture des feuilles de temps aux superviseurs
-- sera ajouté avec le module "Suivi d'équipe" (table geoplan_timesheet, étape 5).
