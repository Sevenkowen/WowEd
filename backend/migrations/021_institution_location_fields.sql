-- Ubicación explícita en instituciones (país, provincia/estado, localidad).
-- Antes `country` mezclaba código de país y provincia argentina.

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS city text;

-- Datos legacy: códigos de provincia guardados en `country`.
UPDATE institutions
SET
  province = country,
  country = 'AR'
WHERE country IS NOT NULL
  AND country <> 'AR'
  AND upper(trim(country)) IN (
    'BA', 'CABA', 'CAT', 'CHA', 'CHU', 'COR', 'CORR', 'ER', 'FOR', 'JUJ',
    'LP', 'LR', 'MEN', 'MIS', 'NEU', 'RN', 'SAL', 'SJ', 'SL', 'SC', 'SF', 'SE', 'TF', 'TUC'
  );
