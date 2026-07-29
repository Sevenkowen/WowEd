-- Responsable institucional + turnos por colegio

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS responsible_name text;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS shift_morning boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_afternoon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_night boolean NOT NULL DEFAULT false;
