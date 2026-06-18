import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_institution_id, resolve_institution_id_from
from app.models.objectives import Objective
from app.schemas.objectives import (
    CreateObjectiveBody,
    ObjectiveDto,
    ObjectivesListResponse,
    UpdateObjectiveBody,
)

router = APIRouter(prefix="/objectives", tags=["objectives"])


def _to_dto(obj: Objective) -> ObjectiveDto:
    return ObjectiveDto(
        id=str(obj.id),
        title=obj.title,
        description=obj.description,
        indicators=list(obj.indicators or []),
        responsables=list(obj.responsables or []),
        plazo=obj.plazo,
        status=obj.status,
        area=obj.area,
        owner=obj.owner,
        progress_pct=obj.progress_pct,
        sort_order=obj.sort_order,
    )


@router.get("", response_model=ObjectivesListResponse)
def list_objectives(
    institution_id: str | None = None,
    area: str | None = None,
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id(institution_id)
    q = select(Objective).where(Objective.institution_id == inst).order_by(Objective.sort_order, Objective.title)
    if area:
        q = q.where(Objective.area == area)
    rows = db.scalars(q).all()
    return ObjectivesListResponse(items=[_to_dto(r) for r in rows])


@router.post("", response_model=ObjectiveDto)
def create_objective(
    body: CreateObjectiveBody,
    institution_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id_from(body.institution_id, institution_id)
    title = body.title.strip()
    if not title:
        raise HTTPException(400, "El título no puede estar vacío")
    obj = Objective(
        id=uuid.uuid4(),
        institution_id=inst,
        title=title,
        description=body.description,
        indicators=body.indicators,
        responsables=body.responsables,
        plazo=body.plazo,
        status=body.status,
        area=body.area,
        owner=body.owner,
        progress_pct=body.progress_pct,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _to_dto(obj)


@router.patch("/{objective_id}", response_model=ObjectiveDto)
def update_objective(objective_id: str, body: UpdateObjectiveBody, db: Session = Depends(get_db)):
    obj = db.get(Objective, uuid.UUID(objective_id))
    if not obj:
        raise HTTPException(404, "Objetivo no encontrado")
    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(400, "El título no puede estar vacío")
        obj.title = title
    if body.description is not None:
        obj.description = body.description
    if body.indicators is not None:
        obj.indicators = body.indicators
    if body.responsables is not None:
        obj.responsables = body.responsables
    if body.plazo is not None:
        obj.plazo = body.plazo
    if body.status is not None:
        obj.status = body.status
    if body.area is not None:
        obj.area = body.area
    if body.owner is not None:
        obj.owner = body.owner
    if body.progress_pct is not None:
        obj.progress_pct = body.progress_pct
    if body.sort_order is not None:
        obj.sort_order = body.sort_order
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return _to_dto(obj)


@router.delete("/{objective_id}", status_code=204)
def delete_objective(objective_id: str, db: Session = Depends(get_db)):
    obj = db.get(Objective, uuid.UUID(objective_id))
    if not obj:
        raise HTTPException(404, "Objetivo no encontrado")
    db.delete(obj)
    db.commit()
