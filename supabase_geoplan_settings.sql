-- Table pour stocker tous les paramétrages GéoPlan (partagés entre utilisateurs)
CREATE TABLE IF NOT EXISTS geoplan_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Activer RLS (Row Level Security)
ALTER TABLE geoplan_settings ENABLE ROW LEVEL SECURITY;

-- Politique : tout utilisateur authentifié peut lire
CREATE POLICY "Authenticated users can read settings" ON geoplan_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique : tout utilisateur authentifié peut insérer/modifier
CREATE POLICY "Authenticated users can upsert settings" ON geoplan_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" ON geoplan_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete settings" ON geoplan_settings
  FOR DELETE USING (auth.role() = 'authenticated');

-- Index sur updated_at pour tri
CREATE INDEX IF NOT EXISTS idx_geoplan_settings_updated ON geoplan_settings(updated_at);
