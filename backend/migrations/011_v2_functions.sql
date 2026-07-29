-- Funciones helper del paquete v2 (sin RLS: la app actual no setea app.user_id).

CREATE OR REPLACE FUNCTION current_app_user()
RETURNS uuid AS $$
DECLARE v text;
BEGIN
  v := current_setting('app.user_id', true);
  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;
  RETURN v::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_active_member(p_user uuid, p_unit uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM unit_memberships um
    WHERE um.user_id = p_user
      AND um.unit_id = p_unit
      AND (um.valid_from IS NULL OR now() >= um.valid_from)
      AND (um.valid_to IS NULL OR now() <= um.valid_to)
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_descendant_units(root_id uuid)
RETURNS TABLE(id uuid) AS $$
WITH RECURSIVE tree AS (
  SELECT ou.id FROM organizational_units ou WHERE ou.id = root_id
  UNION ALL
  SELECT child.id FROM organizational_units child JOIN tree parent ON child.parent_unit_id = parent.id
)
SELECT tree.id FROM tree;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_user_visible_units(p_user uuid)
RETURNS TABLE(id uuid) AS $$
WITH active_units AS (
  SELECT um.unit_id FROM unit_memberships um
  WHERE um.user_id = p_user
    AND (um.valid_from IS NULL OR now() >= um.valid_from)
    AND (um.valid_to IS NULL OR now() <= um.valid_to)
), recursive_units AS (
  SELECT unit_id AS id FROM active_units
  UNION
  SELECT du.id FROM active_units au CROSS JOIN LATERAL get_descendant_units(au.unit_id) du
)
SELECT DISTINCT recursive_units.id FROM recursive_units;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION user_is_active_leader_for_unit(p_user uuid, p_unit uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM unit_memberships um
    JOIN get_descendant_units(um.unit_id) du ON du.id = p_unit
    WHERE um.user_id = p_user
      AND um.role_in_unit = 'leader'
      AND (um.valid_from IS NULL OR now() >= um.valid_from)
      AND (um.valid_to IS NULL OR now() <= um.valid_to)
  );
END;
$$ LANGUAGE plpgsql STABLE;
