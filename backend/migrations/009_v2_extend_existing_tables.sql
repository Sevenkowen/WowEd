-- Columnas adicionales del esquema v2 en tablas ya usadas por la app.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamp;

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS institution_program_id uuid REFERENCES institution_programs(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamp;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS institution_program_id uuid REFERENCES institution_programs(id),
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamp,
  ADD COLUMN IF NOT EXISTS close_comment text;

-- role_templates base (equipo directivo + docentes)
INSERT INTO role_templates (id, name, code, role_in_unit, teaching_role, description)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Director', 'director', 'leader', NULL, 'Responsable jerarquico de una unidad'),
  ('00000000-0000-0000-0000-000000000102', 'Docente titular', 'docente_titular', 'leader', 'titular', 'Docente responsable principal de un curso'),
  ('00000000-0000-0000-0000-000000000103', 'Docente suplente', 'docente_suplente', 'leader', 'suplente', 'Docente suplente'),
  ('00000000-0000-0000-0000-000000000104', 'Profesor transversal', 'profesor_transversal', 'member', 'especial', 'Docente de materia transversal'),
  ('00000000-0000-0000-0000-000000000105', 'Preceptor', 'preceptor', 'member', NULL, 'Preceptor'),
  ('00000000-0000-0000-0000-000000000106', 'Administrativo', 'administrativo', 'member', NULL, 'Administrativo'),
  ('00000000-0000-0000-0000-000000000107', 'Vicedirector', 'vicedirector', 'leader', NULL, 'Vicedirector'),
  ('00000000-0000-0000-0000-000000000108', 'Coordinador pedagogico', 'coordinador_pedagogico', 'member', NULL, 'Coordinador pedagogico'),
  ('00000000-0000-0000-0000-000000000109', 'Secretaria academica', 'secretaria_academica', 'member', NULL, 'Secretaria academica')
ON CONFLICT (code) DO NOTHING;
