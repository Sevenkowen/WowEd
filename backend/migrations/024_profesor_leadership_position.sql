-- Profesor como cargo asignable en personal (school_memberships)

INSERT INTO leadership_positions (key, label, sort_order) VALUES
  ('profesor', 'Profesor', 70)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
