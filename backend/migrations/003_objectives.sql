-- Objetivos institucionales (PAI / planificación)

CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY,
  institution_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsables JSONB NOT NULL DEFAULT '[]'::jsonb,
  plazo TEXT NULL,
  status TEXT NOT NULL DEFAULT 'En Progreso',
  area TEXT NULL,
  owner TEXT NULL,
  progress_pct INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS objectives_institution_id_idx ON objectives (institution_id);
