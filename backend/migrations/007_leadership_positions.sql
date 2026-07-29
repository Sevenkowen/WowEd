-- Cargos del equipo directivo (catálogo + vínculo con school_memberships.role)

CREATE TABLE IF NOT EXISTS leadership_positions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO leadership_positions (key, label, sort_order) VALUES
  ('director', 'Director/a', 10),
  ('vicedirector_secundario', 'Vicedirector Nivel Secundario', 20),
  ('vicedirector_primario', 'Vicedirectora Nivel Primario', 30),
  ('coordinador_pedagogico', 'Coordinador Pedagógico', 40),
  ('secretaria_academica', 'Secretaria Académica', 50),
  ('administrador', 'Administrador', 60)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
