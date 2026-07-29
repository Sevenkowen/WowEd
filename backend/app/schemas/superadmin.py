from pydantic import BaseModel, Field

from app.schemas.user_profile import UserProfileCreate, UserProfileDto, UserProfileUpdate


class SuperadminInstitutionDto(BaseModel):
    id: str
    name: str
    responsibleName: str | None = None
    country: str | None = None
    province: str | None = None
    city: str | None = None
    address: str | None = None
    cuit: str | None = None
    phone: str | None = None
    contactEmail: str | None = None
    isActive: bool = True
    schoolCount: int = 0


class CreateSuperadminInstitutionBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    country: str | None = Field(None, max_length=80)
    province: str | None = Field(None, max_length=120)
    city: str | None = Field(None, max_length=120)
    address: str | None = Field(None, max_length=300)
    cuit: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=40)
    contactEmail: str | None = None
    defaultSchoolName: str | None = Field(None, min_length=2, max_length=200)
    administratorUserId: str = Field(..., min_length=1)


class UnassignedAdministratorDto(BaseModel):
    id: str
    displayName: str
    email: str
    username: str | None = None


class CreatePoolAdministratorBody(UserProfileCreate):
    password: str = Field(..., min_length=8)


class UpdateSuperadminInstitutionBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    country: str | None = Field(None, max_length=80)
    province: str | None = Field(None, max_length=120)
    city: str | None = Field(None, max_length=120)
    address: str | None = Field(None, max_length=300)
    cuit: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=40)
    contactEmail: str | None = None
    administratorUserId: str | None = None


class InstitutionSchoolDto(BaseModel):
    id: str
    name: str
    institutionId: str
    institutionName: str
    address: str | None = None
    city: str | None = None
    province: str | None = None
    cuit: str | None = None
    phone: str | None = None
    contactEmail: str | None = None
    directorName: str | None = None
    directorMembershipId: str | None = None
    shiftMorning: bool = False
    shiftAfternoon: bool = False
    shiftNight: bool = False


class CreateSchoolBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    address: str | None = Field(None, max_length=300)
    city: str | None = Field(None, max_length=120)
    province: str | None = Field(None, max_length=120)
    cuit: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=40)
    contactEmail: str | None = None
    directorMembershipId: str | None = None
    shiftMorning: bool = False
    shiftAfternoon: bool = False
    shiftNight: bool = False


class UpdateSchoolBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    address: str | None = Field(None, max_length=300)
    city: str | None = Field(None, max_length=120)
    province: str | None = Field(None, max_length=120)
    cuit: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=40)
    contactEmail: str | None = None
    directorMembershipId: str | None = None
    shiftMorning: bool = False
    shiftAfternoon: bool = False
    shiftNight: bool = False


class CreateInstitutionMemberBody(UserProfileCreate):
    password: str = Field(..., min_length=8)
    schoolId: str | None = None
    positionKey: str = Field(..., min_length=1)


class UpdateInstitutionMemberBody(UserProfileUpdate):
    positionKey: str | None = None
    schoolId: str | None = None
    password: str | None = Field(None, min_length=8)


class InstitutionMemberDto(BaseModel):
    id: str
    membershipId: str
    email: str
    firstName: str | None
    lastName: str | None
    displayName: str
    positionKey: str
    positionLabel: str
    schoolId: str
    schoolName: str | None
    profile: UserProfileDto


class SuperadminPersonnelRoleDto(BaseModel):
    key: str
    label: str
    membershipId: str | None = None
    removable: bool = True
    institutionId: str | None = None
    roleCode: str | None = None
    isSystemReserved: bool = False


class SuperadminPersonnelDto(BaseModel):
    id: str
    displayName: str
    email: str
    dni: str | None = None
    cuil: str | None = None
    phone: str | None = None
    profile: UserProfileDto
    roles: list[SuperadminPersonnelRoleDto]
    isActive: bool = True
    mustChangePassword: bool = False
    isOwner: bool = False
    canEdit: bool = True
    canDelete: bool = True
    institutionId: str | None = None
    schoolId: str | None = None
    membershipId: str | None = None
    positionKey: str | None = None


class PaginatedPersonnelResponseDto(BaseModel):
    items: list[SuperadminPersonnelDto]
    total: int
    page: int
    pageSize: int
    totalPages: int


class PaginatedInstitutionsResponseDto(BaseModel):
    items: list[SuperadminInstitutionDto]
    total: int
    page: int
    pageSize: int
    totalPages: int


class UpdateSuperadminPersonnelBody(UserProfileUpdate):
    isActive: bool | None = None
    mustChangePassword: bool | None = None
    password: str | None = Field(None, min_length=8)
    positionKey: str | None = None
    roleKeys: list[str] | None = None
    schoolId: str | None = None
    institutionId: str | None = None
    membershipId: str | None = None


class SuperadminRoleDto(BaseModel):
    id: str
    name: str
    description: str
    scopeLabel: str
    scopeType: str
    institutionId: str | None = None
    roleCode: str | None = None
    isSystemReserved: bool = False
    canEdit: bool = False
    canDelete: bool = False
    allowedModules: list[str] = Field(default_factory=list)


class CreateInstitutionalRoleBody(BaseModel):
    institutionId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(None, max_length=500)
    allowedModules: list[str] = Field(default_factory=list)


class UpdateInstitutionalRoleBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(None, max_length=500)
    allowedModules: list[str] | None = None


class AdminCreateInstitutionalRoleBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(None, max_length=500)
    allowedModules: list[str] = Field(default_factory=list)


class SuperadminDashboardStatsDto(BaseModel):
    institutionCount: int
    userCount: int
    schoolCount: int
    personnelCount: int
    customRoleCount: int
    authMethod: str
    passwordHash: str
    multiTenantIsolation: bool


class AdminDashboardStatsDto(BaseModel):
    institutionId: str
    institutionName: str
    userCount: int
    schoolCount: int
    personnelCount: int
    customRoleCount: int
    authMethod: str
    passwordHash: str
    multiTenantIsolation: bool


class SuperadminGradeDto(BaseModel):
    id: str
    name: str
    institutionId: str
    institutionName: str
    schoolId: str | None = None
    schoolName: str
    subjectCount: int = 0


class SuperadminSubjectAssignmentDto(BaseModel):
    id: str
    subject: str
    gradeName: str
    schoolName: str
    institutionName: str
    institutionId: str
    teacherName: str


class SuperadminAcademicStructureDto(BaseModel):
    schools: list[InstitutionSchoolDto]
    grades: list[SuperadminGradeDto]
    subjectAssignments: list[SuperadminSubjectAssignmentDto]


class BulkPersonnelRowInput(CreateInstitutionMemberBody):
    schoolName: str | None = Field(default=None, max_length=200)


class BulkPersonnelImportBody(BaseModel):
    rows: list[BulkPersonnelRowInput] = Field(..., min_length=1, max_length=200)


class BulkPersonnelRowResultDto(BaseModel):
    row: int
    status: str
    userId: str | None = None
    username: str | None = None
    error: str | None = None


class BulkPersonnelImportResultDto(BaseModel):
    created: int
    linked: int
    failed: int
    results: list[BulkPersonnelRowResultDto]


class SuperadminAdministratorDto(BaseModel):
    id: str
    membershipId: str | None = None
    email: str
    firstName: str | None
    lastName: str | None
    displayName: str
    positionKey: str
    positionLabel: str
    schoolId: str | None = None
    schoolName: str | None = None
    profile: UserProfileDto
    institutionId: str | None = None
    institutionName: str | None = None
    isUnassigned: bool = False


class PaginatedAdministratorsResponseDto(BaseModel):
    items: list[SuperadminAdministratorDto]
    total: int
    page: int
    pageSize: int
    totalPages: int
