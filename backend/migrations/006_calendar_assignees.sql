-- Asignación de usuarios a eventos y tareas del calendario

CREATE TABLE IF NOT EXISTS calendar_event_assignees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NULL REFERENCES users(id),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS calendar_event_assignees_event_idx ON calendar_event_assignees (event_id);
CREATE INDEX IF NOT EXISTS calendar_event_assignees_user_idx ON calendar_event_assignees (user_id);

CREATE TABLE IF NOT EXISTS task_assignees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NULL REFERENCES users(id),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS task_assignees_task_idx ON task_assignees (task_id);
CREATE INDEX IF NOT EXISTS task_assignees_user_idx ON task_assignees (user_id);
