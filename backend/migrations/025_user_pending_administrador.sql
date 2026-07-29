-- Administradores creados en pool global, pendientes de asignación a una institución.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pending_administrador boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_pending_administrador_idx
  ON users (pending_administrador)
  WHERE pending_administrador = true;
