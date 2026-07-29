-- Roles de plataforma (catálogo RBAC) + datos de contacto institucionales

CREATE TABLE IF NOT EXISTS platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_system_reserved boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO platform_roles (id, code, name, description, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000201', 'superadmin', 'SuperAdmin', 'Rol jerárquico de nivel SuperAdmin', 10),
  ('00000000-0000-0000-0000-000000000202', 'administrador', 'Administrador', 'Rol jerárquico de nivel Administrador', 20),
  ('00000000-0000-0000-0000-000000000203', 'director', 'Director', 'Rol jerárquico de nivel Director', 30),
  ('00000000-0000-0000-0000-000000000204', 'profesor', 'Profesor', 'Rol jerárquico de nivel Profesor', 40)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS cuit text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS cuit text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;
