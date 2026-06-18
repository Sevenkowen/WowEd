import uuid
from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WeeklyPlannerWeek(Base):
    __tablename__ = "weekly_planner_weeks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    week: Mapped[int] = mapped_column(Integer, nullable=False)
    foco_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class WeeklyPlannerMatrixTask(Base):
    __tablename__ = "weekly_planner_matrix_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    week_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("weekly_planner_weeks.id", ondelete="CASCADE"))
    quadrant: Mapped[str] = mapped_column(Text, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class WeeklyPlannerBlock(Base):
    __tablename__ = "weekly_planner_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    week_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("weekly_planner_weeks.id", ondelete="CASCADE"))
    day_of_week: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    block_type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class WeeklyPlannerDelegatedTask(Base):
    __tablename__ = "weekly_planner_delegated_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    week_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("weekly_planner_weeks.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    assignee: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="Pendiente")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
