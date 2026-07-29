-- Sincroniza datos legacy (schools / school_memberships) al modelo v2.

INSERT INTO user_institutions (user_id, institution_id)
SELECT DISTINCT sm.user_id, s.institution_id
FROM school_memberships sm
JOIN schools s ON s.id = sm.school_id
WHERE s.institution_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO organizational_units (id, institution_id, source_school_id, name, type)
SELECT s.id, s.institution_id, s.id, COALESCE(s.name, 'Establecimiento'), 'institution'
FROM schools s
WHERE s.institution_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  institution_id = EXCLUDED.institution_id,
  source_school_id = EXCLUDED.source_school_id;

INSERT INTO unit_memberships (
  id,
  user_id,
  unit_id,
  role_template_id,
  role_in_unit,
  source_membership_id
)
SELECT
  gen_random_uuid(),
  sm.user_id,
  sm.school_id,
  rt.id,
  CASE WHEN sm.role = 'director' THEN 'leader' ELSE 'member' END,
  sm.id
FROM school_memberships sm
JOIN schools s ON s.id = sm.school_id
LEFT JOIN role_templates rt ON rt.code = CASE
  WHEN sm.role IN ('director') THEN 'director'
  WHEN sm.role IN ('vicedirector_secundario', 'vicedirector_primario') THEN 'vicedirector'
  WHEN sm.role = 'coordinador_pedagogico' THEN 'coordinador_pedagogico'
  WHEN sm.role = 'secretaria_academica' THEN 'secretaria_academica'
  WHEN sm.role = 'administrador' THEN 'administrativo'
  ELSE NULL
END
WHERE s.institution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM unit_memberships um WHERE um.source_membership_id = sm.id
  );

-- Copia asignados actuales del calendario al modelo v2 (solo usuarios).
INSERT INTO event_assignments (id, event_id, assigned_user_id)
SELECT gen_random_uuid(), cea.event_id, cea.user_id
FROM calendar_event_assignees cea
WHERE NOT EXISTS (
  SELECT 1 FROM event_assignments ea
  WHERE ea.event_id = cea.event_id AND ea.assigned_user_id = cea.user_id
);

INSERT INTO task_assignments (id, task_id, assigned_user_id)
SELECT gen_random_uuid(), ta.task_id, ta.user_id
FROM task_assignees ta
WHERE NOT EXISTS (
  SELECT 1 FROM task_assignments tav2
  WHERE tav2.task_id = ta.task_id AND tav2.assigned_user_id = ta.user_id
);
