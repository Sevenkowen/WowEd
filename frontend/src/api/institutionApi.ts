import { apiFetch, withInstitution } from '@/api/http'
import {
  stripEmptyOptionalProfileFields,
  type UserProfileCreatePayload,
  type UserProfileOptional,
} from '@/types/userProfile'

export interface InstitutionUser {
  id: string
  email: string
  displayName: string
  profile?: UserProfileOptional
}

export interface LeadershipMember {
  id: string
  membershipId: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  positionKey: string
  positionLabel: string
  schoolId: string
  schoolName: string | null
  profile?: UserProfileOptional
}

export interface LeadershipPosition {
  key: string
  label: string
}

export interface InstitutionSchool {
  id: string
  name: string
}

export type UpdateLeadershipMemberPayload = UserProfileOptional & {
  positionKey: string
  schoolId?: string
  password?: string
}

export type CreateLeadershipMemberPayload = UserProfileCreatePayload & {
  positionKey: string
  password: string
  schoolId: string
}

export async function fetchInstitutionUsers(): Promise<InstitutionUser[]> {
  return apiFetch<InstitutionUser[]>(withInstitution('/institution/users'))
}

export async function fetchLeadershipTeam(): Promise<LeadershipMember[]> {
  return apiFetch<LeadershipMember[]>(withInstitution('/institution/leadership-team'))
}

export async function fetchDirectivos(): Promise<LeadershipMember[]> {
  const base = withInstitution('/institution/leadership-team')
  return apiFetch<LeadershipMember[]>(`${base}&directivos_only=true`)
}

export async function fetchLeadershipPositions(): Promise<LeadershipPosition[]> {
  return apiFetch<LeadershipPosition[]>('/institution/leadership-positions')
}

export async function fetchInstitutionSchools(): Promise<InstitutionSchool[]> {
  return apiFetch<InstitutionSchool[]>(withInstitution('/institution/schools'))
}

export async function createLeadershipMember(
  payload: CreateLeadershipMemberPayload,
): Promise<LeadershipMember> {
  return apiFetch<LeadershipMember>(withInstitution('/institution/leadership-team'), {
    method: 'POST',
    body: JSON.stringify(stripEmptyOptionalProfileFields(payload)),
  })
}

export async function updateLeadershipMember(
  membershipId: string,
  payload: UpdateLeadershipMemberPayload,
): Promise<LeadershipMember> {
  return apiFetch<LeadershipMember>(
    withInstitution(`/institution/leadership-team/${encodeURIComponent(membershipId)}`),
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function deleteLeadershipMember(membershipId: string): Promise<void> {
  await apiFetch<void>(
    withInstitution(`/institution/leadership-team/${encodeURIComponent(membershipId)}`),
    { method: 'DELETE' },
  )
}
