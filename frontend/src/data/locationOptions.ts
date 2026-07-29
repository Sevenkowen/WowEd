export type LocationOption = { value: string; label: string }

export const countryOptions: LocationOption[] = [
  { value: 'AR', label: 'Argentina' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'CL', label: 'Chile' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'MX', label: 'México' },
  { value: 'ES', label: 'España' },
  { value: 'US', label: 'Estados Unidos' },
]

export const argentinaProvinceOptions: LocationOption[] = [
  { value: 'BA', label: 'Buenos Aires' },
  { value: 'CABA', label: 'Ciudad Autónoma de Buenos Aires' },
  { value: 'CAT', label: 'Catamarca' },
  { value: 'CHA', label: 'Chaco' },
  { value: 'CHU', label: 'Chubut' },
  { value: 'COR', label: 'Córdoba' },
  { value: 'CORR', label: 'Corrientes' },
  { value: 'ER', label: 'Entre Ríos' },
  { value: 'FOR', label: 'Formosa' },
  { value: 'JUJ', label: 'Jujuy' },
  { value: 'LP', label: 'La Pampa' },
  { value: 'LR', label: 'La Rioja' },
  { value: 'MEN', label: 'Mendoza' },
  { value: 'MIS', label: 'Misiones' },
  { value: 'NEU', label: 'Neuquén' },
  { value: 'RN', label: 'Río Negro' },
  { value: 'SAL', label: 'Salta' },
  { value: 'SJ', label: 'San Juan' },
  { value: 'SL', label: 'San Luis' },
  { value: 'SC', label: 'Santa Cruz' },
  { value: 'SF', label: 'Santa Fe' },
  { value: 'SE', label: 'Santiago del Estero' },
  { value: 'TF', label: 'Tierra del Fuego' },
  { value: 'TUC', label: 'Tucumán' },
]

const provinceLabelByCode = new Map(argentinaProvinceOptions.map((option) => [option.value, option.label]))
const countryLabelByCode = new Map(countryOptions.map((option) => [option.value, option.label]))

export function provinceLabel(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  return provinceLabelByCode.get(code) ?? code
}

export function countryLabel(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  return countryLabelByCode.get(code) ?? code
}

export function optionsWithCurrent(
  options: LocationOption[],
  current: string | null | undefined,
): LocationOption[] {
  if (current && !options.some((option) => option.value === current)) {
    return [{ value: current, label: current }, ...options]
  }
  return options
}

export function formatInstitutionLocation(input: {
  country?: string | null
  province?: string | null
  city?: string | null
  address?: string | null
}): string {
  const parts: string[] = []
  if (input.city?.trim()) parts.push(input.city.trim())
  const province = provinceLabel(input.province)
  if (province) parts.push(province)
  const country = countryLabel(input.country)
  if (country && input.country !== 'AR') parts.push(country)
  if (input.address?.trim()) parts.push(input.address.trim())
  return parts.length ? parts.join(', ') : 'Sin ubicación registrada'
}
