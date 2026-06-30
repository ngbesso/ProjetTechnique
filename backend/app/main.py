from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import (
    auth,
    admin_rbac,
    churches,
    donations,
    health,
    members,
    admin_users,
    sermons,
)
from app.core.config import settings
from app.seed import run as seed_run
from app.services import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_run()
    try:
        storage.ensure_bucket()
    except Exception as e:
        print(f"[startup] MinIO indisponible, bucket non vérifié : {e}")
    yield


app = FastAPI(title="API Plateforme OBNL", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router)
app.include_router(admin_rbac.router)
app.include_router(churches.router)
app.include_router(members.router)
app.include_router(donations.router)
app.include_router(sermons.router)
app.include_router(admin_users.router)


@app.get("/")
def root():
    return {"service": "backend", "status": "ok"}
