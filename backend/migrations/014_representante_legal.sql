-- Representante legal en equipo institucional

INSERT INTO leadership_positions (key, label, sort_order) VALUES
  ('representante_legal', 'Representante legal', 5)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
