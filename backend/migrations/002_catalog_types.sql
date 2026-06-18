-- Catálogos de tipos de evento y tarea + institution_id en tasks

CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY,
  institution_id UUID NULL,
  name TEXT NOT NULL,
  color TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_types_institution_name_idx
  ON event_types (institution_id, lower(name));

CREATE TABLE IF NOT EXISTS task_types (
  id UUID PRIMARY KEY,
  institution_id UUID NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS task_types_institution_name_idx
  ON task_types (institution_id, lower(name));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS institution_id UUID;

CREATE INDEX IF NOT EXISTS tasks_institution_id_idx ON tasks (institution_id);
