from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    login: str = Field(min_length=1, description="Nombre de usuario o mail personal")
    password: str = Field(min_length=1)


class DirectorContext(BaseModel):
    school_id: str
    school_name: str
    institution_id: str
    institution_name: str
    role: str


class AuthUser(BaseModel):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    display_name: str
    role: str
    school_id: str | None = None
    school_name: str | None = None
    institution_id: str | None = None
    institution_name: str | None = None
    is_superadmin: bool = False
    is_owner: bool = False
    must_change_password: bool = False
    allowedModules: list[str] = Field(default_factory=list)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser
    contexts: list[DirectorContext]


class MeResponse(BaseModel):
    user: AuthUser
    contexts: list[DirectorContext]


class ChangePasswordResponse(BaseModel):
    user: AuthUser
