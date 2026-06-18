from pydantic import BaseModel, Field


class CalEventDto(BaseModel):
    """Forma compatible con el frontend (CalEvent)."""

    id: str
    name: str
    time: str
    datetime: str
    endDatetime: str | None = None
    href: str = "#"
    description: str | None = None
    eventType: str | None = None
    allDay: bool = False


class CalTaskDto(BaseModel):
    """Forma compatible con el frontend (CalTask)."""

    id: str
    date: str
    title: str
    description: str | None = None
    tipo: str | None = None
    cuadrante: str | None = None
    eventId: str | None = None
    completed: bool = False
    time: str | None = None
    endTime: str | None = None
    allDay: bool = False
    recurrence: str | None = None


class CreateEventBody(BaseModel):
    date: str = Field(description="YYYY-MM-DD")
    title: str
    description: str | None = None
    start_time: str | None = Field(None, description="HH:mm")
    end_time: str | None = Field(None, description="HH:mm")
    all_day: bool = False
    event_type: str | None = None
    recurrence: str = "none"
    institution_id: str | None = None


class CreateTaskBody(BaseModel):
    date: str
    title: str
    description: str | None = None
    tipo: str | None = None
    cuadrante: str | None = None
    event_id: str | None = None
    time: str | None = None
    end_time: str | None = None
    all_day: bool = False
    completed: bool = False
    recurrence: str = "none"
    institution_id: str | None = None


class MoveEventBody(BaseModel):
    date: str
    start_time: str


class ResizeEventBody(BaseModel):
    end_time: str


class MoveTaskBody(BaseModel):
    date: str
    time: str | None = None


class ResizeTaskBody(BaseModel):
    end_time: str


class PatchEventBody(BaseModel):
    title: str | None = None
    description: str | None = None
    date: str | None = None
    start_time: str | None = Field(None, description="HH:mm")
    end_time: str | None = Field(None, description="HH:mm")
    all_day: bool | None = None
    event_type: str | None = None


class PatchTaskBody(BaseModel):
    completed: bool | None = None
    cuadrante: str | None = None
    title: str | None = None
    description: str | None = None
    date: str | None = None
    tipo: str | None = None
    time: str | None = None
    end_time: str | None = None
    all_day: bool | None = None
    event_id: str | None = None


class EventsByDateResponse(BaseModel):
    por_fecha: dict[str, list[CalEventDto]]


class TasksByDateResponse(BaseModel):
    por_fecha: dict[str, list[CalTaskDto]]
