-- Planificador semanal (foco, matriz, bloques, tareas delegadas)

CREATE TABLE IF NOT EXISTS weekly_planner_weeks (
  id UUID PRIMARY KEY,
  institution_id UUID NOT NULL,
  year INT NOT NULL,
  week INT NOT NULL,
  foco_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, year, week)
);

CREATE TABLE IF NOT EXISTS weekly_planner_matrix_tasks (
  id UUID PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES weekly_planner_weeks(id) ON DELETE CASCADE,
  quadrant TEXT NOT NULL,
  text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS weekly_planner_matrix_week_idx ON weekly_planner_matrix_tasks (week_id);

CREATE TABLE IF NOT EXISTS weekly_planner_blocks (
  id UUID PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES weekly_planner_weeks(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS weekly_planner_blocks_week_idx ON weekly_planner_blocks (week_id);

CREATE TABLE IF NOT EXISTS weekly_planner_delegated_tasks (
  id UUID PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES weekly_planner_weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee TEXT NULL,
  due_date DATE NULL,
  follow_up_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS weekly_planner_delegated_week_idx ON weekly_planner_delegated_tasks (week_id);
