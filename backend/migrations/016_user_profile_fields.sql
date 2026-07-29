-- Perfil extendido de usuarios (datos personales y login por nombre de usuario)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS dni text,
  ADD COLUMN IF NOT EXISTS cuil text,
  ADD COLUMN IF NOT EXISTS personal_email text;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
  ON users (lower(username)) WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_personal_email_lower_idx
  ON users (lower(personal_email)) WHERE personal_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_dni_idx
  ON users (dni) WHERE dni IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_cuil_idx
  ON users (cuil) WHERE cuil IS NOT NULL;
