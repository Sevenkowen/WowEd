-- Roles personalizados por institución (RBAC superadmin)

CREATE TABLE IF NOT EXISTS institutional_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS institutional_roles_institution_name_uidx
  ON institutional_roles (institution_id, lower(trim(name)));
