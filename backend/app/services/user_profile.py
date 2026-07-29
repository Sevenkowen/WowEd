import uuid

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user_profile import UserProfileCreate, UserProfileUpdate
from app.services.security import hash_password


def display_name_for_user(user: User) -> str:
    if user.full_name and user.full_name.strip():
        return user.full_name.strip()
    parts = [user.first_name or "", user.last_name or ""]
    name = " ".join(p.strip() for p in parts if p and p.strip())
    return name or user.personal_email or user.email


def display_name_from_row(row) -> str:
    if row.get("full_name") and str(row["full_name"]).strip():
        return str(row["full_name"]).strip()
    parts = [row.get("first_name") or "", row.get("last_name") or ""]
    name = " ".join(p.strip() for p in parts if p and str(p).strip())
    return name or row.get("personal_email") or row.get("email") or ""


def profile_from_row(row) -> dict:
    full_name = row.get("full_name")
    if not full_name or not str(full_name).strip():
        parts = [row.get("first_name") or "", row.get("last_name") or ""]
        full_name = " ".join(p.strip() for p in parts if p and str(p).strip()) or None
    return {
        "username": row.get("username"),
        "fullName": full_name,
        "address": row.get("address"),
        "phone": row.get("phone"),
        "dni": row.get("dni"),
        "cuil": row.get("cuil"),
        "personalEmail": row.get("personal_email") or row.get("email"),
    }


def _split_full_name(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name or not full_name.strip():
        return None, None
    parts = full_name.strip().split(None, 1)
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], parts[1]


def assert_profile_unique(
    db: Session,
    profile: UserProfileCreate | UserProfileUpdate,
    *,
    exclude_user_id: uuid.UUID | None = None,
) -> None:
    checks: list[tuple[str, str]] = []
    if isinstance(profile, UserProfileCreate):
        checks.extend(
            [
                ("username", profile.username),
                ("personal_email", profile.personalEmail.lower()),
            ]
        )
        if profile.dni:
            checks.append(("dni", profile.dni))
        if profile.cuil:
            checks.append(("cuil", profile.cuil))
    else:
        if profile.username:
            checks.append(("username", profile.username))
        if profile.personalEmail:
            checks.append(("personal_email", profile.personalEmail.lower()))
        if profile.dni:
            checks.append(("dni", profile.dni))
        if profile.cuil:
            checks.append(("cuil", profile.cuil))

    for field, value in checks:
        stmt = select(User.id)
        if field == "username":
            stmt = stmt.where(func.lower(User.username) == value.lower())
        elif field == "personal_email":
            stmt = stmt.where(
                or_(
                    func.lower(User.personal_email) == value.lower(),
                    func.lower(User.email) == value.lower(),
                )
            )
        elif field == "dni":
            stmt = stmt.where(User.dni == value)
        elif field == "cuil":
            stmt = stmt.where(User.cuil == value)
        if exclude_user_id:
            stmt = stmt.where(User.id != exclude_user_id)
        existing = db.scalar(stmt)
        if existing:
            labels = {
                "username": "nombre de usuario",
                "personal_email": "mail personal",
                "dni": "DNI",
                "cuil": "CUIL",
            }
            raise HTTPException(409, f"Ya existe un usuario con ese {labels[field]}")


def find_user_by_login(db: Session, login: str) -> User | None:
    key = login.strip().lower()
    for column in (User.email, User.username, User.personal_email):
        user = db.scalar(select(User).where(func.lower(column) == key))
        if user is not None:
            return user
    return None


def find_existing_user_by_profile(db: Session, profile: UserProfileCreate) -> User | None:
    conditions = [
        func.lower(User.username) == profile.username,
        func.lower(User.personal_email) == profile.personalEmail.lower(),
    ]
    if profile.dni:
        conditions.append(User.dni == profile.dni)
    if profile.cuil:
        conditions.append(User.cuil == profile.cuil)
    return db.scalar(select(User).where(or_(*conditions)))


def apply_profile_to_user(user: User, profile: UserProfileCreate | UserProfileUpdate) -> None:
    if isinstance(profile, UserProfileCreate):
        first, last = _split_full_name(profile.fullName)
        user.username = profile.username
        user.full_name = profile.fullName
        user.first_name = first
        user.last_name = last
        user.address = profile.address
        user.phone = profile.phone
        user.dni = profile.dni
        user.cuil = profile.cuil
        user.personal_email = profile.personalEmail.lower()
        user.email = profile.personalEmail.lower()
        return

    if profile.username is not None:
        user.username = profile.username
    if profile.fullName is not None:
        first, last = _split_full_name(profile.fullName)
        user.full_name = profile.fullName
        user.first_name = first
        user.last_name = last
    if profile.address is not None:
        user.address = profile.address or None
    if profile.phone is not None:
        user.phone = profile.phone or None
    if profile.dni is not None:
        user.dni = profile.dni or None
    if profile.cuil is not None:
        user.cuil = profile.cuil or None
    if profile.personalEmail is not None:
        user.personal_email = profile.personalEmail.lower()
        user.email = profile.personalEmail.lower()


def create_user_with_profile(db: Session, profile: UserProfileCreate, password: str) -> User:
    assert_profile_unique(db, profile)
    first, last = _split_full_name(profile.fullName)
    user = User(
        id=uuid.uuid4(),
        username=profile.username,
        full_name=profile.fullName,
        first_name=first,
        last_name=last,
        address=profile.address,
        phone=profile.phone,
        dni=profile.dni,
        cuil=profile.cuil,
        personal_email=profile.personalEmail.lower(),
        email=profile.personalEmail.lower(),
        password_hash=hash_password(password),
        is_active=True,
        must_change_password=False,
        is_owner=False,
    )
    db.add(user)
    return user
