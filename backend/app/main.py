from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import calendar, catalog, health, objectives, weekly_planner

app = FastAPI(title="WowEd API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(objectives.router, prefix="/api")
app.include_router(weekly_planner.router, prefix="/api")
