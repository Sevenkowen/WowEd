-- Rol owner de plataforma (flag en users.is_owner)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_is_owner_idx ON users (is_owner) WHERE is_owner = true;
