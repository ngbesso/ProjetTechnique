from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import donations, health
from app.core.config import settings

app = FastAPI(title="API Plateforme OBNL", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(donations.router)


@app.get("/")
def root():
    return {"service": "backend", "status": "ok"}
