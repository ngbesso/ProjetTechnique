import sys
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import (
    auth,
    admin_rbac,
    churches,
    dashboard,
    donations,
    events,
    health,
    members,
    admin_users,
    parameters,
    posts,
    prayer_requests,
    reports,
    sermons,
    settings as settings_routes,
    volunteer_requests,
)
from app.core.config import settings
from app.core.email import get_email_sender
from app.db.session import SessionLocal
from app.seed import run as seed_run
from app.services import storage
from app.services.reminder_service import send_due_reminders

_scheduler: BackgroundScheduler | None = None


def _run_reminder_job() -> None:
    db = SessionLocal()
    try:
        send_due_reminders(db, get_email_sender())
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_run()
    try:
        storage.ensure_bucket()
    except Exception as e:
        print(f"[startup] MinIO indisponible, bucket non vérifié : {e}")

    # Désactivé pendant les tests (pytest importe l'app dans le même process)
    # pour ne pas interférer avec les transactions de test.
    global _scheduler
    if "pytest" not in sys.modules:
        _scheduler = BackgroundScheduler()
        _scheduler.add_job(_run_reminder_job, "interval", hours=1, id="event_reminders")
        _scheduler.start()

    yield

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None


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
app.include_router(events.router)
app.include_router(posts.router)
app.include_router(admin_users.router)
app.include_router(parameters.router)
app.include_router(settings_routes.router)
app.include_router(dashboard.router)
app.include_router(prayer_requests.router)
app.include_router(volunteer_requests.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"service": "backend", "status": "ok"}
