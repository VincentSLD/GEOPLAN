-- ═══ Erreurs & Modifications (Qualité) GéoPlan ═══
-- 1 ligne = 1 événement (erreur de notre part OU modification demandée par le client)
-- lié à une commande. Alimente l'outil « Erreurs / Modifs » (saisie par tous,
-- analyse par les superviseurs). À exécuter dans l'éditeur SQL Supabase.
-- ⚠️ Remplace 'vsalaud@be-gph.fr' par le(s) e-mail(s) admin si besoin.
-- Dépend de la table geoplan_supervisors (voir supabase_geoplan_supervisors.sql).

create table if not exists geoplan_qualite (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  created_by       text,                       -- e-mail du déclarant (= JWT email)
  -- Commande / affaire liée (dénormalisé pour filtrer/agréger sans jointure)
  commande_id      text,
  commande_ref     text,
  affaire_ref      text,
  client_name      text,
  societe          text,
  -- Nature : 'erreur' (de notre part) | 'modification' (demande client)
  nature           text not null,
  type_code        text,
  type_label       text,
  sous_type_code   text,
  sous_type_label  text,
  gravite          text,                       -- 'mineure' | 'majeure' | 'critique'
  -- Modification : payante (avenant) ou gratuite (geste commercial)
  payante          boolean,
  temps_passe      numeric,                    -- heures passées à corriger / modifier
  -- Erreur : facture liée à notre erreur
  facture_liee     boolean default false,
  facture_ref      text,
  montant_facture  numeric,
  -- Démarche qualité
  cause_racine     text,
  action_corrective text,
  statut           text default 'ouvert',      -- 'ouvert' | 'en_cours' | 'cloture'
  responsable_email text,                      -- responsable du traitement
  description      text,
  date_evenement   date,
  notified         jsonb default '[]'::jsonb   -- e-mails notifiés à la création
);

create index if not exists idx_geoqualite_commande on geoplan_qualite (commande_id);
create index if not exists idx_geoqualite_date on geoplan_qualite (date_evenement);
create index if not exists idx_geoqualite_nature on geoplan_qualite (nature);

alter table geoplan_qualite enable row level security;

-- Lecture : déclarant OU superviseur OU admin
drop policy if exists "qual_select" on geoplan_qualite;
create policy "qual_select" on geoplan_qualite for select using (
  lower(created_by) = lower(auth.jwt()->>'email')
  or lower(auth.jwt()->>'email') = 'vsalaud@be-gph.fr'
  or exists (select 1 from geoplan_supervisors s where lower(s.email) = lower(auth.jwt()->>'email'))
);

-- Insertion : tout authentifié, en signant avec son propre e-mail
drop policy if exists "qual_insert" on geoplan_qualite;
create policy "qual_insert" on geoplan_qualite for insert with check (
  auth.role() = 'authenticated'
  and lower(created_by) = lower(auth.jwt()->>'email')
);

-- Mise à jour / suppression : déclarant OU superviseur OU admin
drop policy if exists "qual_update" on geoplan_qualite;
create policy "qual_update" on geoplan_qualite for update using (
  lower(created_by) = lower(auth.jwt()->>'email')
  or lower(auth.jwt()->>'email') = 'vsalaud@be-gph.fr'
  or exists (select 1 from geoplan_supervisors s where lower(s.email) = lower(auth.jwt()->>'email'))
);

drop policy if exists "qual_delete" on geoplan_qualite;
create policy "qual_delete" on geoplan_qualite for delete using (
  lower(created_by) = lower(auth.jwt()->>'email')
  or lower(auth.jwt()->>'email') = 'vsalaud@be-gph.fr'
  or exists (select 1 from geoplan_supervisors s where lower(s.email) = lower(auth.jwt()->>'email'))
);
