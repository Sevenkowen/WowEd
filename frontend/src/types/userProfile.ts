export interface UserProfile {
  username: string
  fullName: string
  address: string
  phone: string
  dni: string
  cuil: string
  personalEmail: string
}

export interface UserProfileOptional {
  username?: string
  fullName?: string
  address?: string
  phone?: string
  dni?: string
  cuil?: string
  personalEmail?: string
}

/** Campos mínimos para alta de usuario; el resto del perfil es opcional. */
export type UserProfileCreatePayload = UserProfileOptional & {
  username: string
  personalEmail: string
  fullName: string
}

export function emptyUserProfile(): UserProfile {
  return {
    username: '',
    fullName: '',
    address: '',
    phone: '',
    dni: '',
    cuil: '',
    personalEmail: '',
  }
}

export function profileFromMember(member: {
  profile?: UserProfileOptional
  email?: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string
}): UserProfile {
  const p = member.profile
  const nameFromParts = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return {
    username: p?.username ?? '',
    fullName: p?.fullName ?? (nameFromParts || member.displayName || ''),
    address: p?.address ?? '',
    phone: p?.phone ?? '',
    dni: p?.dni ?? '',
    cuil: p?.cuil ?? '',
    personalEmail: p?.personalEmail ?? member.email ?? '',
  }
}

/** Omite campos opcionales vacíos antes de enviar al backend. */
export function stripEmptyOptionalProfileFields<T extends UserProfileOptional>(payload: T): T {
  const cleaned = { ...payload }
  for (const key of ['address', 'phone', 'dni', 'cuil'] as const) {
    const value = cleaned[key]
    if (value == null || !String(value).trim()) {
      delete cleaned[key]
    }
  }
  return cleaned
}

/** Envía campos obligatorios y solo opcionales con valor. */
export function normalizeProfileForApi(profile: UserProfile): UserProfileCreatePayload {
  return stripEmptyOptionalProfileFields({
    username: profile.username.trim(),
    personalEmail: profile.personalEmail.trim(),
    fullName: profile.fullName.trim(),
    address: profile.address.trim() || undefined,
    phone: profile.phone.trim() || undefined,
    dni: profile.dni.trim() || undefined,
    cuil: profile.cuil.trim() || undefined,
  }) as UserProfileCreatePayload
}
