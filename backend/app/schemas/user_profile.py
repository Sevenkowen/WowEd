from pydantic import BaseModel, EmailStr, Field, field_validator
import re

_USERNAME_RE = re.compile(r"^[\w.\-@]+$")


def _empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def _normalize_username_value(value: str) -> str:
    cleaned = value.strip().lower()
    if len(cleaned) < 3:
        raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
    if not _USERNAME_RE.match(cleaned):
        raise ValueError(
            "El nombre de usuario solo puede tener letras, números, puntos, guiones, guiones bajos y @"
        )
    return cleaned


class UserProfileCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    personalEmail: EmailStr
    fullName: str = Field(..., min_length=2, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=40)
    dni: str | None = Field(default=None, max_length=20)
    cuil: str | None = Field(default=None, max_length=13)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return _normalize_username_value(value)

    @field_validator("fullName", mode="before")
    @classmethod
    def normalize_full_name(cls, value: str | None) -> str:
        if not isinstance(value, str):
            raise ValueError("El nombre completo es obligatorio")
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("El nombre completo es obligatorio")
        return stripped

    @field_validator("address", "phone", "dni", "cuil", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        return _empty_to_none(value)


class UserProfileUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=100)
    fullName: str | None = Field(None, min_length=2, max_length=200)
    address: str | None = Field(None, max_length=300)
    phone: str | None = Field(None, max_length=40)
    dni: str | None = Field(None, max_length=20)
    cuil: str | None = Field(None, max_length=13)
    personalEmail: EmailStr | None = None

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower()
        if not cleaned:
            return None
        return _normalize_username_value(cleaned)

    @field_validator("fullName", mode="before")
    @classmethod
    def normalize_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if not stripped:
            return None
        if len(stripped) < 2:
            raise ValueError("El nombre completo debe tener al menos 2 caracteres")
        return stripped

    @field_validator("address", "phone", "dni", "cuil", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        return _empty_to_none(value)


class UserProfileDto(BaseModel):
    username: str | None = None
    fullName: str | None = None
    address: str | None = None
    phone: str | None = None
    dni: str | None = None
    cuil: str | None = None
    personalEmail: str | None = None
