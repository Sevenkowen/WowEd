import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.config import DEFAULT_INSTITUTION_UUID, settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthUser,
    ChangePasswordRequest,
    ChangePasswordResponse,
    DirectorContext,
    LoginRequest,
    LoginResponse,
    MeResponse,
)
from app.services.security import create_access_token, decode_access_token, hash_password, verify_password
from app.services.module_permissions import resolve_user_allowed_modules
from app.services.personnel_roles import resolve_role_allowed_modules
from app.services.user_profile import display_name_for_user, find_user_by_login

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def _display_name(user: User) -> str:
    return display_name_for_user(user)


def _leadership_contexts(db: Session, user_id: uuid.UUID) -> list[DirectorContext]:
    rows = db.execute(
        text(
            """
            SELECT sm.role, s.id AS school_id, s.name AS school_name,
                   s.institution_id, i.name AS institution_name,
                   COALESCE(lp.sort_order, 1000) AS sort_order
            FROM school_memberships sm
            JOIN schools s ON s.id = sm.school_id
            LEFT JOIN institutions i ON i.id = s.institution_id
            LEFT JOIN leadership_positions lp ON lp.key = sm.role
            LEFT JOIN institutional_roles ir
              ON ir.id::text = sm.role AND ir.institution_id = s.institution_id
            WHERE sm.user_id = :user_id
              AND (lp.key IS NOT NULL OR ir.id IS NOT NULL)
            ORDER BY sort_order, s.name
            """
        ),
        {"user_id": user_id},
    ).mappings().all()

    return [
        DirectorContext(
            school_id=str(row["school_id"]),
            school_name=row["school_name"] or "Escuela",
            institution_id=str(row["institution_id"]),
            institution_name=row["institution_name"],
            role=row["role"] or "director",
        )
        for row in rows
        if row["institution_id"]
    ]


# Alias interno usado por login y /me
_director_contexts = _leadership_contexts

def _is_superadmin(user: User) -> bool:
    return bool(user.is_owner)


# Alias legacy
_is_platform_owner = _is_superadmin


def _build_auth_user(user: User, ctx: DirectorContext | None = None, db: Session | None = None) -> AuthUser:
    must_change = bool(user.must_change_password)
    if _is_superadmin(user) and ctx is None:
        return AuthUser(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            display_name=_display_name(user),
            role="superadmin",
            is_superadmin=True,
            is_owner=True,
            must_change_password=must_change,
            allowedModules=resolve_user_allowed_modules("superadmin"),
        )
    if not ctx:
        raise ValueError("context required for non-superadmin user")
    role_code = ctx.role or "director"
    allowed_modules = (
        resolve_role_allowed_modules(db, uuid.UUID(ctx.institution_id), role_code)
        if db is not None
        else resolve_user_allowed_modules(role_code)
    )
    return AuthUser(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=_display_name(user),
        role=role_code,
        school_id=ctx.school_id,
        school_name=ctx.school_name,
        institution_id=ctx.institution_id,
        institution_name=ctx.institution_name,
        is_superadmin=_is_superadmin(user),
        is_owner=_is_superadmin(user),
        must_change_password=must_change,
        allowedModules=allowed_modules,
    )


def _token_for(user: User, ctx: DirectorContext | None = None) -> str:
    if _is_superadmin(user) and ctx is None:
        return create_access_token(
            {
                "sub": str(user.id),
                "email": user.email,
                "role": "superadmin",
            }
        )
    if not ctx:
        raise ValueError("context required for non-superadmin user")
    return create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": ctx.role,
            "school_id": ctx.school_id,
            "institution_id": ctx.institution_id,
        }
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "No autenticado")
    try:
        payload = decode_access_token(creds.credentials)
    except ValueError as exc:
        raise HTTPException(401, "Sesión inválida o expirada") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Token inválido")

    user = db.get(User, uuid.UUID(str(user_id)))
    if not user:
        raise HTTPException(401, "Usuario no encontrado")
    if user.is_active is False:
        raise HTTPException(403, "Tu cuenta está desactivada")
    return user


def get_token_payload(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "No autenticado")
    try:
        return decode_access_token(creds.credentials)
    except ValueError as exc:
        raise HTTPException(401, "Sesión inválida o expirada") from exc


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = find_user_by_login(db, body.login)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    if user.is_active is False:
        raise HTTPException(403, "Tu cuenta está desactivada. Contactá al administrador.")

    contexts = _director_contexts(db, user.id)
    if _is_superadmin(user):
        return LoginResponse(
            access_token=_token_for(user),
            user=_build_auth_user(user),
            contexts=contexts,
        )
    if not contexts:
        raise HTTPException(403, "Tu usuario no pertenece al equipo directivo de ninguna escuela")

    default_inst = settings.default_institution_id or DEFAULT_INSTITUTION_UUID
    primary = next((c for c in contexts if c.institution_id == default_inst), contexts[0])
    return LoginResponse(
        access_token=_token_for(user, primary),
        user=_build_auth_user(user, primary, db),
        contexts=contexts,
    )


@router.get("/me", response_model=MeResponse)
def me(
    user: User = Depends(get_current_user),
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
) -> MeResponse:
    contexts = _director_contexts(db, user.id)
    if _is_superadmin(user):
        return MeResponse(user=_build_auth_user(user), contexts=contexts)

    if not contexts:
        raise HTTPException(403, "Tu usuario no pertenece al equipo directivo")

    institution_id = str(payload.get("institution_id") or "")
    school_id = str(payload.get("school_id") or "")
    active = next(
        (c for c in contexts if c.institution_id == institution_id and c.school_id == school_id),
        contexts[0],
    )
    return MeResponse(user=_build_auth_user(user, active, db), contexts=contexts)


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
) -> ChangePasswordResponse:
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "La contraseña actual es incorrecta")
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(400, "La nueva contraseña debe ser distinta a la actual")

    db.execute(
        text(
            """
            UPDATE users
            SET password_hash = :password_hash, must_change_password = false
            WHERE id = :user_id
            """
        ),
        {"password_hash": hash_password(body.new_password), "user_id": user.id},
    )
    db.commit()
    db.refresh(user)

    contexts = _director_contexts(db, user.id)
    if _is_superadmin(user):
        return ChangePasswordResponse(user=_build_auth_user(user))

    if not contexts:
        raise HTTPException(403, "Tu usuario no pertenece al equipo directivo")

    institution_id = str(payload.get("institution_id") or "")
    school_id = str(payload.get("school_id") or "")
    active = next(
        (c for c in contexts if c.institution_id == institution_id and c.school_id == school_id),
        contexts[0],
    )
    return ChangePasswordResponse(user=_build_auth_user(user, active, db))
