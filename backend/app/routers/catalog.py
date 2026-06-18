import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_institution_id, resolve_institution_id_from
from app.models.catalog import EventType, TaskType
from app.schemas.catalog import (
    CatalogItemDto,
    CatalogListResponse,
    CreateCatalogItemBody,
    UpdateCatalogItemBody,
)
from app.services.catalog_seed import ensure_catalog_seeded

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _event_to_dto(row: EventType) -> CatalogItemDto:
    return CatalogItemDto(
        id=str(row.id),
        name=row.name,
        color=row.color,
        sort_order=row.sort_order,
    )


def _task_to_dto(row: TaskType) -> CatalogItemDto:
    return CatalogItemDto(
        id=str(row.id),
        name=row.name,
        sort_order=row.sort_order,
    )


@router.get("/event-types", response_model=CatalogListResponse)
def list_event_types(
    institution_id: str | None = None,
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id(institution_id)
    ensure_catalog_seeded(db, inst)
    rows = db.scalars(
        select(EventType)
        .where(EventType.institution_id == inst)
        .order_by(EventType.sort_order, EventType.name)
    ).all()
    return CatalogListResponse(items=[_event_to_dto(r) for r in rows])


@router.post("/event-types", response_model=CatalogItemDto)
def create_event_type(
    body: CreateCatalogItemBody,
    institution_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id_from(body.institution_id, institution_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "El nombre no puede estar vacío")
    exists = db.scalar(
        select(EventType.id).where(
            EventType.institution_id == inst,
            EventType.name.ilike(name),
        )
    )
    if exists:
        raise HTTPException(400, "Ya existe un tipo de evento con ese nombre")
    row = EventType(
        id=uuid.uuid4(),
        institution_id=inst,
        name=name,
        color=body.color,
        sort_order=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _event_to_dto(row)


@router.patch("/event-types/{type_id}", response_model=CatalogItemDto)
def update_event_type(type_id: str, body: UpdateCatalogItemBody, db: Session = Depends(get_db)):
    row = db.get(EventType, uuid.UUID(type_id))
    if not row:
        raise HTTPException(404, "Tipo de evento no encontrado")
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(400, "El nombre no puede estar vacío")
        row.name = name
    if body.color is not None:
        row.color = body.color
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    db.commit()
    db.refresh(row)
    return _event_to_dto(row)


@router.delete("/event-types/{type_id}", status_code=204)
def delete_event_type(
    type_id: str,
    institution_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id(institution_id)
    row = db.get(EventType, uuid.UUID(type_id))
    if not row or row.institution_id != inst:
        raise HTTPException(404, "Tipo de evento no encontrado")
    total = len(db.scalars(select(EventType).where(EventType.institution_id == inst)).all())
    if total <= 1:
        raise HTTPException(400, "Debe quedar al menos un tipo de evento")
    db.delete(row)
    db.commit()


@router.get("/task-types", response_model=CatalogListResponse)
def list_task_types(
    institution_id: str | None = None,
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id(institution_id)
    ensure_catalog_seeded(db, inst)
    rows = db.scalars(
        select(TaskType)
        .where(TaskType.institution_id == inst)
        .order_by(TaskType.sort_order, TaskType.name)
    ).all()
    return CatalogListResponse(items=[_task_to_dto(r) for r in rows])


@router.post("/task-types", response_model=CatalogItemDto)
def create_task_type(
    body: CreateCatalogItemBody,
    institution_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id_from(body.institution_id, institution_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "El nombre no puede estar vacío")
    exists = db.scalar(
        select(TaskType.id).where(
            TaskType.institution_id == inst,
            TaskType.name.ilike(name),
        )
    )
    if exists:
        raise HTTPException(400, "Ya existe un tipo de tarea con ese nombre")
    row = TaskType(
        id=uuid.uuid4(),
        institution_id=inst,
        name=name,
        sort_order=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _task_to_dto(row)


@router.patch("/task-types/{type_id}", response_model=CatalogItemDto)
def update_task_type(type_id: str, body: UpdateCatalogItemBody, db: Session = Depends(get_db)):
    row = db.get(TaskType, uuid.UUID(type_id))
    if not row:
        raise HTTPException(404, "Tipo de tarea no encontrado")
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(400, "El nombre no puede estar vacío")
        row.name = name
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    db.commit()
    db.refresh(row)
    return _task_to_dto(row)


@router.delete("/task-types/{type_id}", status_code=204)
def delete_task_type(
    type_id: str,
    institution_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id(institution_id)
    row = db.get(TaskType, uuid.UUID(type_id))
    if not row or row.institution_id != inst:
        raise HTTPException(404, "Tipo de tarea no encontrado")
    total = len(db.scalars(select(TaskType).where(TaskType.institution_id == inst)).all())
    if total <= 1:
        raise HTTPException(400, "Debe quedar al menos un tipo de tarea")
    db.delete(row)
    db.commit()
