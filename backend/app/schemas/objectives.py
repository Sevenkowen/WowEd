from pydantic import BaseModel, Field


class ObjectiveDto(BaseModel):
    id: str
    title: str
    description: str | None = None
    indicators: list[str] = Field(default_factory=list)
    responsables: list[str] = Field(default_factory=list)
    plazo: str | None = None
    status: str = "En Progreso"
    area: str | None = None
    owner: str | None = None
    progress_pct: int = 0
    sort_order: int = 0


class CreateObjectiveBody(BaseModel):
    title: str
    description: str | None = None
    indicators: list[str] = Field(default_factory=list)
    responsables: list[str] = Field(default_factory=list)
    plazo: str | None = None
    status: str = "En Progreso"
    area: str | None = None
    owner: str | None = None
    progress_pct: int = 0
    institution_id: str | None = None


class UpdateObjectiveBody(BaseModel):
    title: str | None = None
    description: str | None = None
    indicators: list[str] | None = None
    responsables: list[str] | None = None
    plazo: str | None = None
    status: str | None = None
    area: str | None = None
    owner: str | None = None
    progress_pct: int | None = None
    sort_order: int | None = None


class ObjectivesListResponse(BaseModel):
    items: list[ObjectiveDto]
