-- Ajustes para tablas v2 creadas antes de la migración completa

ALTER TABLE institution_programs
  ADD COLUMN IF NOT EXISTS official_code text,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

ALTER TABLE organizational_units
  ADD COLUMN IF NOT EXISTS source_school_id uuid REFERENCES schools(id),
  ADD COLUMN IF NOT EXISTS institution_program_id uuid REFERENCES institution_programs(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamp;
