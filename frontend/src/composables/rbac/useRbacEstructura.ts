import { computed, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  createClassroom,
  createProgram,
  createTeacher,
  deleteTeacher,
  fetchPrograms,
  updateTeacher,
} from '@/api/structureApi'
import type { InstitutionSchool, SuperadminAcademicStructure, SuperadminGrade, SuperadminInstitution } from '@/api/superadminApi'
import type { LeadershipMember } from '@/api/institutionApi'
import type { Teacher } from '@/api/structureApi'
import type { RbacEstructuraModuleConfig } from '@/types/rbac'
import { emptyUserProfile } from '@/types/userProfile'

export interface SchoolRow extends InstitutionSchool {
  contactLines: string[]
}

export interface TeacherRow extends Teacher {
  institutionId: string
  institutionName: string
}

export function useRbacEstructura(configSource: MaybeRefOrGetter<RbacEstructuraModuleConfig>) {
  const config = computed(() => toValue(configSource))
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const institutions = ref<SuperadminInstitution[]>([])
  const structure = ref<SuperadminAcademicStructure | null>(null)
  const directorsByInstitution = ref<Record<string, LeadershipMember[]>>({})
  const teachersByInstitution = ref<Record<string, Teacher[]>>({})

  const editingSchool = ref<InstitutionSchool | null>(null)
  const managingSchool = ref<SchoolRow | null>(null)
  const selectedInstitutionId = ref('')

  const schoolForm = ref({
    name: '',
    directorMembershipId: '',
    address: '',
    city: '',
    province: '',
    cuit: '',
    phone: '',
    email: '',
    shiftMorning: false,
    shiftAfternoon: false,
    shiftNight: false,
  })

  const editSchoolForm = ref({
    name: '',
    directorMembershipId: '',
    address: '',
    city: '',
    province: '',
    cuit: '',
    phone: '',
    email: '',
    shiftMorning: false,
    shiftAfternoon: false,
    shiftNight: false,
  })

  const gradeForm = ref({ name: '' })

  const teacherForm = ref({
    institutionId: '',
    subject: '',
    password: '',
    profile: emptyUserProfile(),
  })

  const editingTeacher = ref<TeacherRow | null>(null)
  const editTeacherForm = ref({
    subject: '',
    password: '',
    profile: emptyUserProfile(),
  })

  const schoolRows = computed((): SchoolRow[] =>
    (structure.value?.schools ?? []).map((school) => {
      const contactLines: string[] = []
      if (school.cuit) contactLines.push(`CUIT: ${school.cuit}`)
      if (school.phone) contactLines.push(`Tel: ${school.phone}`)
      if (school.contactEmail) contactLines.push(school.contactEmail)
      if (school.address) contactLines.push(school.address)
      if (school.city || school.province) {
        contactLines.push([school.city, school.province].filter(Boolean).join(', '))
      }
      if (!contactLines.length) contactLines.push('Sin datos de contacto')
      return { ...school, contactLines }
    }),
  )

  const gradeRows = computed((): SuperadminGrade[] => structure.value?.grades ?? [])
  const allSchools = computed(() => structure.value?.schools ?? [])

  const activeInstitutionId = computed(() =>
    config.value.showInstitutionPicker
      ? selectedInstitutionId.value
      : config.value.resolveInstitutionId() ?? '',
  )

  const selectedInstitutionName = computed(() => {
    if (!activeInstitutionId.value) return ''
    const fromList = institutions.value.find((inst) => inst.id === activeInstitutionId.value)?.name
    if (fromList) return fromList
    return allSchools.value.find((school) => school.institutionId === activeInstitutionId.value)?.institutionName ?? ''
  })

  const filteredSchoolRows = computed((): SchoolRow[] => {
    if (!activeInstitutionId.value) return []
    return schoolRows.value.filter((school) => school.institutionId === activeInstitutionId.value)
  })

  const gradeCountBySchoolId = computed(() => {
    const counts: Record<string, number> = {}
    for (const grade of gradeRows.value) {
      if (!grade.schoolId) continue
      counts[grade.schoolId] = (counts[grade.schoolId] ?? 0) + 1
    }
    return counts
  })

  const gradesForManagingSchool = computed((): SuperadminGrade[] => {
    if (!managingSchool.value) return []
    return gradeRows.value.filter((grade) => grade.schoolId === managingSchool.value?.id)
  })

  const teacherInstitutionOptions = computed(() => {
    if (config.value.showInstitutionPicker) {
      return institutions.value.map((inst) => ({ id: inst.id, name: inst.name }))
    }
    const institutionId = config.value.resolveInstitutionId()
    if (!institutionId) return []
    const name = allSchools.value[0]?.institutionName ?? 'Mi institución'
    return [{ id: institutionId, name }]
  })

  const teacherRows = computed((): TeacherRow[] => {
    const rows: TeacherRow[] = []
    for (const option of teacherInstitutionOptions.value) {
      const teachers = teachersByInstitution.value[option.id] ?? []
      for (const teacher of teachers) {
        rows.push({
          ...teacher,
          institutionId: option.id,
          institutionName: option.name,
        })
      }
    }
    return rows.sort((a, b) =>
      `${a.institutionName} ${a.displayName}`.localeCompare(`${b.institutionName} ${b.displayName}`, 'es'),
    )
  })

  function uniqueDirectors(members: LeadershipMember[]): LeadershipMember[] {
    const seen = new Set<string>()
    return members.filter((member) => {
      if (seen.has(member.id)) return false
      seen.add(member.id)
      return true
    })
  }

  const directorsForSchoolForm = computed(() => {
    const id = activeInstitutionId.value
    if (!id) return []
    return uniqueDirectors(
      (directorsByInstitution.value[id] ?? []).filter((d) => d.positionKey === 'director'),
    )
  })

  const directorsForEditSchool = computed(() => {
    if (!editingSchool.value) return []
    return uniqueDirectors(
      (directorsByInstitution.value[editingSchool.value.institutionId] ?? []).filter(
        (d) => d.positionKey === 'director',
      ),
    )
  })

  async function loadDirectorsAndTeachers() {
    const instIds = config.value.showInstitutionPicker
      ? institutions.value.map((i) => i.id)
      : [config.value.resolveInstitutionId()].filter(Boolean) as string[]

    const dirPairs: [string, LeadershipMember[]][] = []
    const teacherPairs: [string, Teacher[]][] = []
    for (const instId of instIds) {
      dirPairs.push([instId, await config.value.api.fetchDirectors(instId)])
      teacherPairs.push([instId, await config.value.api.fetchTeachers(instId)])
    }
    directorsByInstitution.value = Object.fromEntries(dirPairs)
    teachersByInstitution.value = Object.fromEntries(teacherPairs)
  }

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      if (config.value.fetchInstitutions) {
        institutions.value = await config.value.fetchInstitutions()
      }
      structure.value = await config.value.api.fetchStructure()
      await loadDirectorsAndTeachers()

      const defaultInstId =
        config.value.showInstitutionPicker
          ? institutions.value[0]?.id ?? ''
          : config.value.resolveInstitutionId() ?? ''

      if (!selectedInstitutionId.value && defaultInstId) {
        selectedInstitutionId.value = defaultInstId
      }
      if (!teacherForm.value.institutionId && defaultInstId) {
        teacherForm.value.institutionId = defaultInstId
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar la estructura académica'
    } finally {
      loading.value = false
    }
  }

  async function ensureDefaultProgram(institutionId: string, schoolId: string): Promise<string> {
    const programs = await fetchPrograms(institutionId)
    const existing = programs.find((p) => p.educationLevel === 'General' && p.shift === 'General')
    if (existing) return existing.id
    const created = await createProgram(institutionId, { educationLevel: 'General', shift: 'General' }, schoolId)
    return created.id
  }

  async function submitSchool(): Promise<boolean> {
    const institutionId = activeInstitutionId.value
    if (!institutionId) {
      error.value = 'Seleccioná una institución'
      return false
    }
    saving.value = true
    error.value = null
    try {
      await config.value.api.createSchool({
        institutionId,
        name: schoolForm.value.name.trim(),
        address: schoolForm.value.address.trim() || undefined,
        city: schoolForm.value.city.trim() || undefined,
        province: schoolForm.value.province.trim() || undefined,
        cuit: schoolForm.value.cuit.trim() || undefined,
        phone: schoolForm.value.phone.trim() || undefined,
        contactEmail: schoolForm.value.email.trim() || undefined,
        directorMembershipId: schoolForm.value.directorMembershipId || undefined,
        shiftMorning: schoolForm.value.shiftMorning,
        shiftAfternoon: schoolForm.value.shiftAfternoon,
        shiftNight: schoolForm.value.shiftNight,
      })
      resetCreateSchoolForm()
      await loadAll()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo registrar el colegio'
      return false
    } finally {
      saving.value = false
    }
  }

  function resetCreateSchoolForm() {
    schoolForm.value.name = ''
    schoolForm.value.directorMembershipId = ''
    schoolForm.value.address = ''
    schoolForm.value.city = ''
    schoolForm.value.province = ''
    schoolForm.value.cuit = ''
    schoolForm.value.phone = ''
    schoolForm.value.email = ''
    schoolForm.value.shiftMorning = false
    schoolForm.value.shiftAfternoon = false
    schoolForm.value.shiftNight = false
  }

  function openEditSchool(school: InstitutionSchool) {
    editingSchool.value = school
    editSchoolForm.value = {
      name: school.name,
      directorMembershipId: school.directorMembershipId ?? '',
      address: school.address ?? '',
      city: school.city ?? '',
      province: school.province ?? '',
      cuit: school.cuit ?? '',
      phone: school.phone ?? '',
      email: school.contactEmail ?? '',
      shiftMorning: school.shiftMorning ?? false,
      shiftAfternoon: school.shiftAfternoon ?? false,
      shiftNight: school.shiftNight ?? false,
    }
  }

  function closeEditSchool() {
    editingSchool.value = null
  }

  async function saveEditSchool() {
    if (!editingSchool.value) return
    saving.value = true
    error.value = null
    try {
      await config.value.api.updateSchool(editingSchool.value.id, {
        institutionId: editingSchool.value.institutionId,
        name: editSchoolForm.value.name.trim(),
        address: editSchoolForm.value.address.trim() || undefined,
        city: editSchoolForm.value.city.trim() || undefined,
        province: editSchoolForm.value.province.trim() || undefined,
        cuit: editSchoolForm.value.cuit.trim() || undefined,
        phone: editSchoolForm.value.phone.trim() || undefined,
        contactEmail: editSchoolForm.value.email.trim() || undefined,
        directorMembershipId: editSchoolForm.value.directorMembershipId || undefined,
        shiftMorning: editSchoolForm.value.shiftMorning,
        shiftAfternoon: editSchoolForm.value.shiftAfternoon,
        shiftNight: editSchoolForm.value.shiftNight,
      })
      closeEditSchool()
      await loadAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo actualizar el colegio'
    } finally {
      saving.value = false
    }
  }

  async function removeSchool(school: InstitutionSchool) {
    if (!confirm(`¿Eliminar el colegio "${school.name}"?`)) return
    error.value = null
    try {
      await config.value.api.deleteSchool(school.id, school.institutionId)
      if (managingSchool.value?.id === school.id) closeSchoolGradesDialog()
      await loadAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo eliminar el colegio'
    }
  }

  function openSchoolGradesDialog(school: SchoolRow) {
    managingSchool.value = school
    gradeForm.value.name = ''
  }

  function closeSchoolGradesDialog() {
    managingSchool.value = null
    gradeForm.value.name = ''
  }

  async function submitGrade() {
    const school = managingSchool.value
    if (!school) {
      error.value = 'Seleccioná un colegio'
      return
    }
    if (!gradeForm.value.name.trim()) {
      error.value = 'Ingresá el nombre del grado o curso'
      return
    }
    saving.value = true
    error.value = null
    try {
      const programId = await ensureDefaultProgram(school.institutionId, school.id)
      await createClassroom(school.institutionId, { programId, name: gradeForm.value.name.trim() })
      gradeForm.value.name = ''
      await loadAll()
      const refreshed = schoolRows.value.find((item) => item.id === school.id)
      if (refreshed) managingSchool.value = refreshed
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo crear el grado'
    } finally {
      saving.value = false
    }
  }

  async function resolveProgramForInstitution(institutionId: string): Promise<string> {
    const school = allSchools.value.find((item) => item.institutionId === institutionId)
    if (!school) {
      throw new Error('La institución no tiene colegios. Creá uno primero.')
    }
    return ensureDefaultProgram(institutionId, school.id)
  }

  async function submitTeacher() {
    const institutionId = config.value.showInstitutionPicker
      ? teacherForm.value.institutionId
      : config.value.resolveInstitutionId()
    if (!institutionId) {
      error.value = 'Seleccioná una institución'
      return
    }
    if (!teacherForm.value.subject.trim() || !teacherForm.value.password) {
      error.value = 'Completá materia/especialidad y contraseña'
      return
    }
    saving.value = true
    error.value = null
    try {
      const programId = await resolveProgramForInstitution(institutionId)
      await createTeacher(institutionId, {
        ...teacherForm.value.profile,
        programId,
        subject: teacherForm.value.subject.trim(),
        password: teacherForm.value.password,
      })
      teacherForm.value.subject = ''
      teacherForm.value.password = ''
      teacherForm.value.profile = emptyUserProfile()
      await loadAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo registrar el profesor'
    } finally {
      saving.value = false
    }
  }

  function openEditTeacher(teacher: TeacherRow) {
    editingTeacher.value = teacher
    editTeacherForm.value = {
      subject: teacher.subject ?? '',
      password: '',
      profile: {
        email: teacher.email,
        firstName: teacher.firstName ?? '',
        lastName: teacher.lastName ?? '',
        username: teacher.profile?.username ?? '',
        fullName: teacher.profile?.fullName ?? '',
        address: teacher.profile?.address ?? '',
        phone: teacher.profile?.phone ?? '',
        dni: teacher.profile?.dni ?? '',
        cuil: teacher.profile?.cuil ?? '',
        personalEmail: teacher.profile?.personalEmail ?? '',
      },
    }
  }

  function closeEditTeacher() {
    editingTeacher.value = null
  }

  async function saveEditTeacher() {
    if (!editingTeacher.value) return
    saving.value = true
    error.value = null
    try {
      await updateTeacher(editingTeacher.value.institutionId, editingTeacher.value.membershipId, {
        ...editTeacherForm.value.profile,
        subject: editTeacherForm.value.subject.trim() || undefined,
        password: editTeacherForm.value.password || undefined,
      })
      closeEditTeacher()
      await loadAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo actualizar el profesor'
    } finally {
      saving.value = false
    }
  }

  async function removeTeacher(teacher: TeacherRow) {
    if (!confirm(`¿Eliminar al profesor "${teacher.displayName}"?`)) return
    error.value = null
    try {
      await deleteTeacher(teacher.institutionId, teacher.membershipId)
      await loadAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo eliminar el profesor'
    }
  }

  if (config.value.showInstitutionPicker) {
    watch(
      () => selectedInstitutionId.value,
      () => {
        schoolForm.value.directorMembershipId = ''
      },
    )
    watch(
      () => teacherForm.value.institutionId,
      () => {
        teacherForm.value.subject = ''
        teacherForm.value.password = ''
      },
    )
  }

  onMounted(() => {
    void loadAll()
  })

  return {
    config,
    loading,
    saving,
    error,
    institutions,
    selectedInstitutionId,
    activeInstitutionId,
    selectedInstitutionName,
    editingSchool,
    managingSchool,
    editingTeacher,
    schoolForm,
    editSchoolForm,
    gradeForm,
    teacherForm,
    editTeacherForm,
    schoolRows,
    filteredSchoolRows,
    gradeRows,
    gradesForManagingSchool,
    gradeCountBySchoolId,
    teacherRows,
    teacherInstitutionOptions,
    directorsForSchoolForm,
    directorsForEditSchool,
    submitSchool,
    resetCreateSchoolForm,
    openEditSchool,
    closeEditSchool,
    saveEditSchool,
    removeSchool,
    openSchoolGradesDialog,
    closeSchoolGradesDialog,
    submitGrade,
    submitTeacher,
    openEditTeacher,
    closeEditTeacher,
    saveEditTeacher,
    removeTeacher,
  }
}
