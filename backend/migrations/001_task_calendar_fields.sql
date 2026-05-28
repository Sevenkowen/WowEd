-- Campos que el calendario Vue necesita y no están en `tasks` todavía.
-- Ejecutar una vez en el VPS (como usuario con permisos DDL):
--   psql -h HOST -U ajenjo -d postgres -f 001_task_calendar_fields.sql

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS cuadrante text,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_preset text;

COMMENT ON COLUMN tasks.due_date IS 'Fecha de la tarea en calendario (YYYY-MM-DD)';
COMMENT ON COLUMN tasks.recurrence_preset IS 'none|daily|weekly|yearly|weekdays|... (preset del front)';
