import { apiFetch, withInstitutionId } from '@/api/http'
import type { UserProfile, UserProfileOptional } from '@/types/userProfile'

function scoped(path: string, institutionId: string, extraQuery?: string): string {
  const base = withInstitutionId(path, institutionId)
  if (!extraQuery) return base
  return `${base}&${extraQuery}`
}

export interface Program {
  id: string
  educationLevel: string
  shift: string
  officialCode: string | null
  levelUnitId: string | null
  classroomCount: number
  teacherCount: number
}

export interface Classroom {
  id: string
  programId: string
  name: string
  educationLevel: string
  teacherCount: number
}

export interface Teacher {
  id: string
  membershipId: string
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  subject: string | null
  classroomIds: string[]
  profile?: UserProfileOptional
}

export interface Assignment {
  id: string
  classroomId: string
  classroomName: string
  teacherUserId: string
  teacherName: string
  subject: string | null
}

export function fetchPrograms(institutionId: string): Promise<Program[]> {
  return apiFetch<Program[]>(withInstitutionId('/institution/structure/programs', institutionId))
}

export function createProgram(
  institutionId: string,
  payload: { educationLevel: string; shift?: string; officialCode?: string },
  schoolId?: string,
): Promise<Program> {
  const extra = schoolId ? `school_id=${encodeURIComponent(schoolId)}` : undefined
  return apiFetch<Program>(scoped('/institution/structure/programs', institutionId, extra), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchClassrooms(institutionId: string, programId?: string): Promise<Classroom[]> {
  const extra = programId ? `program_id=${encodeURIComponent(programId)}` : undefined
  return apiFetch<Classroom[]>(scoped('/institution/structure/classrooms', institutionId, extra))
}

export function createClassroom(
  institutionId: string,
  payload: { programId: string; name: string },
): Promise<Classroom> {
  return apiFetch<Classroom>(withInstitutionId('/institution/structure/classrooms', institutionId), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchTeachers(institutionId: string, programId?: string): Promise<Teacher[]> {
  const extra = programId ? `program_id=${encodeURIComponent(programId)}` : undefined
  return apiFetch<Teacher[]>(scoped('/institution/structure/teachers', institutionId, extra))
}

export function createTeacher(
  institutionId: string,
  payload: UserProfile & {
    programId: string
    subject: string
    password: string
  },
): Promise<Teacher> {
  return apiFetch<Teacher>(withInstitutionId('/institution/structure/teachers', institutionId), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchAssignments(institutionId: string, programId?: string): Promise<Assignment[]> {
  const extra = programId ? `program_id=${encodeURIComponent(programId)}` : undefined
  return apiFetch<Assignment[]>(scoped('/institution/structure/assignments', institutionId, extra))
}

export function createAssignment(
  institutionId: string,
  payload: { classroomId: string; teacherUserId: string; subject?: string },
): Promise<Assignment> {
  return apiFetch<Assignment>(withInstitutionId('/institution/structure/assignments', institutionId), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteAssignment(institutionId: string, assignmentId: string): Promise<void> {
  return apiFetch<void>(
    withInstitutionId(`/institution/structure/assignments/${assignmentId}`, institutionId),
    { method: 'DELETE' },
  )
}

export function updateTeacher(
  institutionId: string,
  membershipId: string,
  payload: UserProfileOptional & {
    subject?: string
    password?: string
  },
): Promise<Teacher> {
  return apiFetch<Teacher>(
    withInstitutionId(`/institution/structure/teachers/${membershipId}`, institutionId),
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
}

export function deleteTeacher(institutionId: string, membershipId: string): Promise<void> {
  return apiFetch<void>(
    withInstitutionId(`/institution/structure/teachers/${membershipId}`, institutionId),
    { method: 'DELETE' },
  )
}
