from pydantic import BaseModel, EmailStr, Field


class OwnerInstitutionDto(BaseModel):
    id: str
    name: str
    country: str | None = None
    isActive: bool = True
    schoolCount: int = 0
    adminCount: int = 0


class CreateOwnerInstitutionBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    schoolName: str | None = Field(None, min_length=2, max_length=200)
    country: str | None = Field(None, max_length=80)


class CreateInstitutionAdminBody(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    firstName: str | None = None
    lastName: str | None = None
    schoolId: str | None = None


class InstitutionAdminDto(BaseModel):
    id: str
    membershipId: str
    email: str
    firstName: str | None
    lastName: str | None
    displayName: str
    schoolId: str
    schoolName: str | None
