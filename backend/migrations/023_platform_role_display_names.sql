-- Nombres de display para los cuatro roles fijos de plataforma

UPDATE platform_roles SET name = 'Super Admin' WHERE code = 'superadmin';
UPDATE platform_roles SET name = 'Administrador' WHERE code = 'administrador';
UPDATE platform_roles SET name = 'Director' WHERE code = 'director';
UPDATE platform_roles SET name = 'Profesor' WHERE code = 'profesor';
