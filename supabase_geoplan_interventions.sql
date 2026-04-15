-- Table dédiée pour les interventions planifiées GéoPlan
CREATE TABLE IF NOT EXISTS geoplan_interventions (
  id SERIAL PRIMARY KEY,
  title TEXT,
  type TEXT,
  date DATE,
  start_time TEXT,
  end_time TEXT,
  duration INTEGER,
  tech_id INTEGER,
  location TEXT,
  client TEXT,
  travel_to INTEGER DEFAULT 0,
  travel_from INTEGER DEFAULT 0,
  travel_to_km FLOAT,
  travel_from_km FLOAT,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  commande_id TEXT,
  commande_ref TEXT,
  affaire_id TEXT,
  affaire_ref TEXT,
  marche_id TEXT,
  marche_ref TEXT,
  marche_adresse TEXT,
  geosolia_id TEXT,
  geosolia_ref TEXT,
  geosolia_name TEXT,
  geosolia_lat FLOAT,
  geosolia_lng FLOAT,
  flags JSONB DEFAULT '[]',
  infos_adv TEXT DEFAULT '',
  is_rapport BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_geoplan_int_date ON geoplan_interventions(date);
CREATE INDEX IF NOT EXISTS idx_geoplan_int_tech ON geoplan_interventions(tech_id);
CREATE INDEX IF NOT EXISTS idx_geoplan_int_commande ON geoplan_interventions(commande_id);
CREATE INDEX IF NOT EXISTS idx_geoplan_int_status ON geoplan_interventions(status);

-- Row Level Security
ALTER TABLE geoplan_interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read" ON geoplan_interventions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON geoplan_interventions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON geoplan_interventions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON geoplan_interventions FOR DELETE USING (auth.role() = 'authenticated');
