from pydantic import BaseModel, Field


class CatalogItemDto(BaseModel):
    id: str
    name: str
    color: str | None = None
    sort_order: int = 0


class CreateCatalogItemBody(BaseModel):
    name: str
    color: str | None = None
    institution_id: str | None = None


class UpdateCatalogItemBody(BaseModel):
    name: str | None = None
    color: str | None = None
    sort_order: int | None = None


class CatalogListResponse(BaseModel):
    items: list[CatalogItemDto]
