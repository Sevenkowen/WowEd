-- Esquema institucional v2 (alumnos, unidades organizacionales, etc.)
-- Compatible con schools / school_memberships existentes.

CREATE TABLE IF NOT EXISTS role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  role_in_unit text NOT NULL CHECK (role_in_unit IN ('leader', 'member')),
  teaching_role text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS institution_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  education_level text NOT NULL,
  shift text NOT NULL,
  official_code text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizational_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  institution_id uuid REFERENCES institutions(id),
  institution_program_id uuid REFERENCES institution_programs(id),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('company','institution','level','cycle','grade','course','area','team','administrative')),
  parent_unit_id uuid REFERENCES organizational_units(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp,
  CONSTRAINT organizational_units_not_self_parent CHECK (id <> parent_unit_id)
);

ALTER TABLE organizational_units
  ADD COLUMN IF NOT EXISTS source_school_id uuid REFERENCES schools(id);

CREATE UNIQUE INDEX IF NOT EXISTS organizational_units_source_school_id_uidx
  ON organizational_units (source_school_id)
  WHERE source_school_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_institutions (
  user_id uuid NOT NULL REFERENCES users(id),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, institution_id)
);

CREATE TABLE IF NOT EXISTS company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS unit_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  unit_id uuid NOT NULL REFERENCES organizational_units(id),
  role_template_id uuid REFERENCES role_templates(id),
  role_in_unit text NOT NULL CHECK (role_in_unit IN ('leader', 'member')),
  teaching_role text,
  valid_from timestamp,
  valid_to timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp,
  CONSTRAINT membership_valid_range CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

ALTER TABLE unit_memberships
  ADD COLUMN IF NOT EXISTS source_membership_id uuid REFERENCES school_memberships(id),
  ADD COLUMN IF NOT EXISTS role_template_id uuid REFERENCES role_templates(id),
  ADD COLUMN IF NOT EXISTS role_in_unit text,
  ADD COLUMN IF NOT EXISTS teaching_role text,
  ADD COLUMN IF NOT EXISTS valid_from timestamp,
  ADD COLUMN IF NOT EXISTS valid_to timestamp,
  ADD COLUMN IF NOT EXISTS updated_at timestamp;

ALTER TABLE unit_memberships
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE unit_memberships SET role_in_unit = 'member' WHERE role_in_unit IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unit_memberships_source_membership_id_uidx
  ON unit_memberships (source_membership_id)
  WHERE source_membership_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  institution_program_id uuid NOT NULL REFERENCES institution_programs(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  document_number text,
  birth_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','graduated','transferred')),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp
);

CREATE TABLE IF NOT EXISTS student_unit_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES organizational_units(id),
  start_date date,
  end_date date,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT student_enrollment_valid_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  institution_program_id uuid NOT NULL REFERENCES institution_programs(id),
  unit_id uuid NOT NULL REFERENCES organizational_units(id),
  subject text NOT NULL,
  teacher_user_id uuid NOT NULL REFERENCES users(id),
  title text,
  description text,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT class_schedule_valid_time CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS class_schedule_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES class_schedules(id),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  institution_program_id uuid NOT NULL REFERENCES institution_programs(id),
  unit_id uuid NOT NULL REFERENCES organizational_units(id),
  teacher_user_id uuid NOT NULL REFERENCES users(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  title text,
  description text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','canceled')),
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp,
  CONSTRAINT class_instance_valid_time CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  assigned_unit_id uuid REFERENCES organizational_units(id),
  assigned_user_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT event_assignment_target CHECK (assigned_unit_id IS NOT NULL OR assigned_user_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS event_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  performed_by uuid REFERENCES users(id),
  comment text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_unit_id uuid REFERENCES organizational_units(id),
  assigned_user_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT task_assignment_target CHECK (assigned_unit_id IS NOT NULL OR assigned_user_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS task_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  performed_by uuid REFERENCES users(id),
  comment text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizational_units_parent ON organizational_units(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_memberships_user ON unit_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_memberships_unit ON unit_memberships(unit_id);
CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_unit_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_unit ON student_unit_enrollments(unit_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_event ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_unit ON event_assignments(assigned_unit_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_unit ON task_assignments(assigned_unit_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_unit_date ON class_schedule_instances(unit_id, date);

ALTER TABLE event_assignments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE task_assignments ALTER COLUMN id SET DEFAULT gen_random_uuid();
