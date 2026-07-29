from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_profile import UserProfileCreate, UserProfileDto, UserProfileUpdate


class ProgramDto(BaseModel):
    id: str
    educationLevel: str
    shift: str
    officialCode: str | None = None
    levelUnitId: str | None = None
    classroomCount: int = 0
    teacherCount: int = 0


class CreateProgramBody(BaseModel):
    educationLevel: str = Field(..., min_length=2, max_length=80)
    shift: str = Field(default="General", min_length=1, max_length=40)
    officialCode: str | None = Field(None, max_length=40)


class ClassroomDto(BaseModel):
    id: str
    programId: str
    name: str
    educationLevel: str
    teacherCount: int = 0


class CreateClassroomBody(BaseModel):
    programId: str
    name: str = Field(..., min_length=1, max_length=40)


class TeacherDto(BaseModel):
    id: str
    membershipId: str
    userId: str
    email: str
    firstName: str | None
    lastName: str | None
    displayName: str
    subject: str | None = None
    classroomIds: list[str] = []
    profile: UserProfileDto


class CreateTeacherBody(UserProfileCreate):
    programId: str
    subject: str = Field(..., min_length=2, max_length=80)
    password: str = Field(..., min_length=8)


class UpdateTeacherBody(UserProfileUpdate):
    subject: str | None = Field(None, min_length=2, max_length=80)
    password: str | None = Field(None, min_length=8)


class AssignmentDto(BaseModel):
    id: str
    classroomId: str
    classroomName: str
    teacherUserId: str
    teacherName: str
    subject: str | None = None


class CreateAssignmentBody(BaseModel):
    classroomId: str
    teacherUserId: str
    subject: str | None = Field(None, max_length=80)
