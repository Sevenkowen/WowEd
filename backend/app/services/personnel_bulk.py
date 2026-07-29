import uuid

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.schemas.superadmin import (
    BulkPersonnelImportBody,
    BulkPersonnelImportResultDto,
    BulkPersonnelRowInput,
    BulkPersonnelRowResultDto,
    CreateInstitutionMemberBody,
)
from app.services.personnel_create import create_institution_member, resolve_school_id


def _row_to_member_body(row: BulkPersonnelRowInput, school_id: str | None) -> CreateInstitutionMemberBody:
    payload = row.model_dump(exclude={"schoolName"})
    payload["schoolId"] = school_id
    return CreateInstitutionMemberBody.model_validate(payload)


def import_personnel_rows(
    db: Session,
    institution_id: uuid.UUID,
    body: BulkPersonnelImportBody,
    *,
    admin_only_roles: frozenset[str],
    allow_admin_only_roles: bool = False,
) -> BulkPersonnelImportResultDto:
    results: list[BulkPersonnelRowResultDto] = []
    created = 0
    linked = 0
    failed = 0

    for index, row in enumerate(body.rows, start=1):
        savepoint = db.begin_nested()
        try:
            school_uuid = resolve_school_id(
                db,
                institution_id,
                school_id=row.schoolId,
                school_name=row.schoolName,
            )
            member_body = _row_to_member_body(row, str(school_uuid))
            user_id, status = create_institution_member(
                db,
                institution_id,
                member_body,
                admin_only_roles=admin_only_roles,
                allow_admin_only_roles=allow_admin_only_roles,
            )
            savepoint.commit()
            if status == "linked":
                linked += 1
            else:
                created += 1
            results.append(
                BulkPersonnelRowResultDto(
                    row=index,
                    status=status,
                    userId=str(user_id),
                    username=member_body.username,
                )
            )
        except ValidationError as exc:
            savepoint.rollback()
            failed += 1
            results.append(
                BulkPersonnelRowResultDto(
                    row=index,
                    status="failed",
                    username=row.username if isinstance(row.username, str) else None,
                    error=_validation_error_message(exc),
                )
            )
        except HTTPException as exc:
            savepoint.rollback()
            failed += 1
            results.append(
                BulkPersonnelRowResultDto(
                    row=index,
                    status="failed",
                    username=row.username,
                    error=str(exc.detail),
                )
            )
        except Exception as exc:  # pragma: no cover - unexpected
            savepoint.rollback()
            failed += 1
            results.append(
                BulkPersonnelRowResultDto(
                    row=index,
                    status="failed",
                    username=row.username,
                    error=str(exc),
                )
            )

    db.commit()
    return BulkPersonnelImportResultDto(
        created=created,
        linked=linked,
        failed=failed,
        results=results,
    )


def _validation_error_message(exc: ValidationError) -> str:
    parts: list[str] = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error.get("loc", ()))
        msg = error.get("msg", "Valor inválido")
        parts.append(f"{loc}: {msg}" if loc else msg)
    return "; ".join(parts) if parts else "Datos inválidos"
