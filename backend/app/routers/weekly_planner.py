import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_institution_id, resolve_institution_id_from
from app.models.weekly_planner import (
    WeeklyPlannerBlock,
    WeeklyPlannerDelegatedTask,
    WeeklyPlannerMatrixTask,
    WeeklyPlannerWeek,
)
from app.schemas.weekly_planner import SaveWeeklyPlannerBody, WeeklyPlannerDto
from app.services.mappers import parse_hhmm

router = APIRouter(prefix="/weekly-planner", tags=["weekly-planner"])

MATRIX_QUADRANTS = ("ui", "nui", "uni", "nuni")
SCHEDULE_DAYS = ("lunes", "martes", "miercoles", "jueves", "viernes")


def _empty_dto(year: int, week: int) -> WeeklyPlannerDto:
    return WeeklyPlannerDto(
        year=year,
        week=week,
        foco="",
        matrix={q: [] for q in MATRIX_QUADRANTS},
        schedule={d: [] for d in SCHEDULE_DAYS},
        delegated=[],
    )


def _week_to_dto(db: Session, week_row: WeeklyPlannerWeek) -> WeeklyPlannerDto:
    matrix_rows = db.scalars(
        select(WeeklyPlannerMatrixTask)
        .where(WeeklyPlannerMatrixTask.week_id == week_row.id)
        .order_by(WeeklyPlannerMatrixTask.sort_order)
    ).all()
    block_rows = db.scalars(
        select(WeeklyPlannerBlock)
        .where(WeeklyPlannerBlock.week_id == week_row.id)
        .order_by(WeeklyPlannerBlock.sort_order)
    ).all()
    delegated_rows = db.scalars(
        select(WeeklyPlannerDelegatedTask)
        .where(WeeklyPlannerDelegatedTask.week_id == week_row.id)
        .order_by(WeeklyPlannerDelegatedTask.sort_order)
    ).all()

    matrix: dict[str, list] = {q: [] for q in MATRIX_QUADRANTS}
    for row in matrix_rows:
        if row.quadrant in matrix:
            matrix[row.quadrant].append({"id": str(row.id), "text": row.text})

    schedule: dict[str, list] = {d: [] for d in SCHEDULE_DAYS}
    for row in block_rows:
        if row.day_of_week in schedule:
            schedule[row.day_of_week].append(
                {
                    "id": str(row.id),
                    "start": row.start_time.strftime("%H:%M"),
                    "end": row.end_time.strftime("%H:%M"),
                    "type": row.block_type,
                    "title": row.title,
                }
            )

    delegated = [
        {
            "id": str(row.id),
            "title": row.title,
            "assignee": row.assignee or "",
            "due": row.due_date.isoformat() if row.due_date else "",
            "followUp": row.follow_up_date.isoformat() if row.follow_up_date else "",
            "status": row.status,
        }
        for row in delegated_rows
    ]

    return WeeklyPlannerDto(
        year=week_row.year,
        week=week_row.week,
        foco=week_row.foco_text or "",
        matrix=matrix,
        schedule=schedule,
        delegated=delegated,
    )


@router.get("", response_model=WeeklyPlannerDto)
def get_weekly_planner(
    year: int = Query(...),
    week: int = Query(...),
    institution_id: str | None = None,
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id(institution_id)
    week_row = db.scalar(
        select(WeeklyPlannerWeek).where(
            WeeklyPlannerWeek.institution_id == inst,
            WeeklyPlannerWeek.year == year,
            WeeklyPlannerWeek.week == week,
        )
    )
    if not week_row:
        return _empty_dto(year, week)
    return _week_to_dto(db, week_row)


@router.put("", response_model=WeeklyPlannerDto)
def save_weekly_planner(
    body: SaveWeeklyPlannerBody,
    institution_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    inst = resolve_institution_id_from(body.institution_id, institution_id)
    week_row = db.scalar(
        select(WeeklyPlannerWeek).where(
            WeeklyPlannerWeek.institution_id == inst,
            WeeklyPlannerWeek.year == body.year,
            WeeklyPlannerWeek.week == body.week,
        )
    )
    if not week_row:
        week_row = WeeklyPlannerWeek(
            id=uuid.uuid4(),
            institution_id=inst,
            year=body.year,
            week=body.week,
            foco_text=body.foco,
        )
        db.add(week_row)
        db.flush()
    else:
        week_row.foco_text = body.foco
        week_row.updated_at = datetime.utcnow()
        db.query(WeeklyPlannerMatrixTask).filter(WeeklyPlannerMatrixTask.week_id == week_row.id).delete()
        db.query(WeeklyPlannerBlock).filter(WeeklyPlannerBlock.week_id == week_row.id).delete()
        db.query(WeeklyPlannerDelegatedTask).filter(WeeklyPlannerDelegatedTask.week_id == week_row.id).delete()

    for quadrant in MATRIX_QUADRANTS:
        for si, item in enumerate(body.matrix.get(quadrant, [])):
            db.add(
                WeeklyPlannerMatrixTask(
                    id=uuid.uuid4(),
                    week_id=week_row.id,
                    quadrant=quadrant,
                    text=item.text,
                    sort_order=si,
                )
            )

    for day in SCHEDULE_DAYS:
        for si, block in enumerate(body.schedule.get(day, [])):
            db.add(
                WeeklyPlannerBlock(
                    id=uuid.uuid4(),
                    week_id=week_row.id,
                    day_of_week=day,
                    start_time=parse_hhmm(block.start),
                    end_time=parse_hhmm(block.end),
                    block_type=block.type,
                    title=block.title,
                    sort_order=si,
                )
            )

    for si, task in enumerate(body.delegated):
        due = date.fromisoformat(task.due) if task.due else None
        follow = date.fromisoformat(task.followUp) if task.followUp else None
        db.add(
            WeeklyPlannerDelegatedTask(
                id=uuid.uuid4(),
                week_id=week_row.id,
                title=task.title,
                assignee=task.assignee or None,
                due_date=due,
                follow_up_date=follow,
                status=task.status,
                sort_order=si,
            )
        )

    db.commit()
    db.refresh(week_row)
    return _week_to_dto(db, week_row)
