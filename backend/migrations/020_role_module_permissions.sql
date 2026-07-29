-- Permisos de módulos por rol personalizado (roles de sistema: catálogo fijo en código)

ALTER TABLE institutional_roles
  ADD COLUMN IF NOT EXISTS allowed_modules jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN institutional_roles.allowed_modules IS
  'Lista JSON de claves de módulo asignables al rol personalizado';
