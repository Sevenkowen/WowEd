-- Institución por defecto para dev / single-tenant (FK en calendar_events)

INSERT INTO institutions (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Institución por defecto')
ON CONFLICT (id) DO NOTHING;
