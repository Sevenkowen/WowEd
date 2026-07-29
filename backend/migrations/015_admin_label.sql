-- Renombrar etiqueta del rol administrador de institución
UPDATE leadership_positions
SET label = 'Admin'
WHERE key = 'administrador';
