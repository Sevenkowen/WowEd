from pydantic import BaseModel, Field

from app.schemas.user_profile import UserProfileCreate, UserProfileDto, UserProfileUpdate


class InstitutionUserDto(BaseModel):
    id: str
    email: str
    displayName: str
    profile: UserProfileDto


class LeadershipPositionDto(BaseModel):
    key: str
    label: str


class LeadershipMemberDto(BaseModel):
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


class UpdateLeadershipMemberBody(UserProfileUpdate):
    positionKey: str = Field(..., min_length=1)
    schoolId: str | None = None
    password: str | None = Field(None, min_length=8)


class CreateLeadershipMemberBody(UserProfileCreate):
    positionKey: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    schoolId: str | None = None


class InstitutionSchoolDto(BaseModel):
    id: str
    name: str
