import type { UserProfileCreatePayload } from '@/types/userProfile'

export const PERSONNEL_BULK_HEADERS = [
  'usuario',
  'email',
  'nombre_completo',
  'contraseña',
  'rol',
  'colegio',
  'dni',
  'cuil',
  'telefono',
  'direccion',
] as const

export type PersonnelBulkHeader = (typeof PERSONNEL_BULK_HEADERS)[number]

export interface PersonnelBulkRoleOption {
  key: string
  label: string
  disabled?: boolean
}

export interface PersonnelBulkParsedRow {
  rowNumber: number
  payload: UserProfileCreatePayload & {
    password: string
    positionKey: string
    schoolName?: string
  }
  errors: string[]
}

export interface PersonnelBulkParseResult {
  rows: PersonnelBulkParsedRow[]
  fatalError: string | null
}

const EXAMPLE_ROW = [
  'jperez',
  'jperez@mail.com',
  'Juan Pérez',
  'TempPass123!',
  'director',
  'Colegio Central',
  '',
  '',
  '',
  '',
]

export function personnelBulkTemplateCsv(): string {
  const lines = [PERSONNEL_BULK_HEADERS.join(';'), EXAMPLE_ROW.join(';')]
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadPersonnelBulkTemplate(filename = 'plantilla-usuarios.csv'): void {
  const blob = new Blob([personnelBulkTemplateCsv()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function detectDelimiter(headerLine: string): ';' | ',' {
  const semicolons = headerLine.split(';').length
  const commas = headerLine.split(',').length
  return semicolons >= commas ? ';' : ','
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

function splitCsvLine(line: string, delimiter: ';' | ','): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function resolveRoleKey(rawRole: string, roleOptions: PersonnelBulkRoleOption[]): string | null {
  const cleaned = rawRole.trim()
  if (!cleaned) return null
  const normalized = cleaned.toLowerCase()

  const byKey = roleOptions.find(
    (option) => !option.disabled && option.key.toLowerCase() === normalized,
  )
  if (byKey) return byKey.key

  const byLabel = roleOptions.find(
    (option) => !option.disabled && option.label.trim().toLowerCase() === normalized,
  )
  if (byLabel) return byLabel.key

  return null
}

function rowValue(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (value?.trim()) return value.trim()
  }
  return ''
}

export function parsePersonnelBulkCsv(
  text: string,
  roleOptions: PersonnelBulkRoleOption[],
): PersonnelBulkParseResult {
  const normalizedText = text.replace(/^\uFEFF/, '').trim()
  if (!normalizedText) {
    return { rows: [], fatalError: 'El archivo está vacío.' }
  }

  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return { rows: [], fatalError: 'El archivo debe incluir encabezados y al menos una fila de datos.' }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader)
  const requiredHeaders = ['usuario', 'email', 'nombre_completo', 'contraseña', 'rol']
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))
  if (missingHeaders.length) {
    return {
      rows: [],
      fatalError: `Faltan columnas obligatorias: ${missingHeaders.join(', ')}`,
    }
  }

  const rows: PersonnelBulkParsedRow[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index], delimiter)
    const record: Record<string, string> = {}
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex]?.trim() ?? ''
    })

    const username = rowValue(record, 'usuario', 'username')
    const personalEmail = rowValue(record, 'email', 'mail', 'personal_email')
    const fullName = rowValue(record, 'nombre_completo', 'nombre', 'full_name')
    const password = rowValue(record, 'contraseña', 'contrasena', 'password')
    const roleRaw = rowValue(record, 'rol', 'role', 'position_key')
    const schoolName = rowValue(record, 'colegio', 'school', 'school_name')
    const dni = rowValue(record, 'dni')
    const cuil = rowValue(record, 'cuil')
    const phone = rowValue(record, 'telefono', 'tel', 'phone')
    const address = rowValue(record, 'direccion', 'address')

    const isEmpty =
      !username &&
      !personalEmail &&
      !fullName &&
      !password &&
      !roleRaw &&
      !schoolName &&
      !dni &&
      !cuil &&
      !phone &&
      !address
    if (isEmpty) continue

    const errors: string[] = []
    if (!username) errors.push('Falta usuario')
    if (!personalEmail) errors.push('Falta email')
    if (!fullName) errors.push('Falta nombre completo')
    if (!password) errors.push('Falta contraseña')
    else if (password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres')
    if (!roleRaw) errors.push('Falta rol')

    const positionKey = roleRaw ? resolveRoleKey(roleRaw, roleOptions) : null
    if (roleRaw && !positionKey) {
      errors.push(`Rol no reconocido: ${roleRaw}`)
    }

    rows.push({
      rowNumber: index + 1,
      payload: {
        username,
        personalEmail,
        fullName,
        password,
        positionKey: positionKey ?? roleRaw,
        schoolName: schoolName || undefined,
        dni: dni || undefined,
        cuil: cuil || undefined,
        phone: phone || undefined,
        address: address || undefined,
      },
      errors,
    })
  }

  if (!rows.length) {
    return { rows: [], fatalError: 'No se encontraron filas con datos para importar.' }
  }

  return { rows, fatalError: null }
}

export function validPersonnelBulkRows(rows: PersonnelBulkParsedRow[]): PersonnelBulkParsedRow[] {
  return rows.filter((row) => row.errors.length === 0)
}
