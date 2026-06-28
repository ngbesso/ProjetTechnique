from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, auth, admin_rbac, churches, members
from app.core.config import settings
from app.seed import run as seed_run


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_run()
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


@app.get("/")
def root():
    return {"service": "backend", "status": "ok"}
