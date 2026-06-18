from pydantic import BaseModel, Field


class MatrixTaskDto(BaseModel):
    id: str
    text: str


class ScheduleBlockDto(BaseModel):
    id: str
    start: str
    end: str
    type: str
    title: str


class DelegatedTaskDto(BaseModel):
    id: str
    title: str
    assignee: str = ""
    due: str = ""
    followUp: str = ""
    status: str = "Pendiente"


class WeeklyPlannerDto(BaseModel):
    year: int
    week: int
    foco: str = ""
    matrix: dict[str, list[MatrixTaskDto]] = Field(default_factory=dict)
    schedule: dict[str, list[ScheduleBlockDto]] = Field(default_factory=dict)
    delegated: list[DelegatedTaskDto] = Field(default_factory=list)


class SaveWeeklyPlannerBody(BaseModel):
    year: int
    week: int
    foco: str = ""
    matrix: dict[str, list[MatrixTaskDto]] = Field(default_factory=dict)
    schedule: dict[str, list[ScheduleBlockDto]] = Field(default_factory=dict)
    delegated: list[DelegatedTaskDto] = Field(default_factory=list)
    institution_id: str | None = None
