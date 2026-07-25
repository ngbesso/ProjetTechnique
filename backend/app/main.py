import sys
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin_rbac,
    admin_users,
    auth,
    churches,
    dashboard,
    donations,
    events,
    health,
    leaders,
    members,
    ministry_affiliations,
    news,
    parameters,
    posts,
    prayer_requests,
    reports,
    sermons,
    volunteer_requests,
)
from app.api.routes import (
    settings as settings_routes,
)
from app.core.config import settings
from app.core.email import get_email_sender
from app.db.session import SessionLocal
from app.seed import run as seed_run
from app.services import storage
from app.services.birthday_service import (
    eastern_today,
    send_daily_birthday_greetings,
    send_monthly_birthday_greetings,
)
from app.services.reminder_service import send_due_reminders

_scheduler: BackgroundScheduler | None = None


def _run_reminder_job() -> None:
    db = SessionLocal()
    try:
        send_due_reminders(db, get_email_sender())
    finally:
        db.close()


def _run_birthday_daily_job() -> None:
    db = SessionLocal()
    try:
        send_daily_birthday_greetings(db, get_email_sender())
    finally:
        db.close()


def _run_birthday_monthly_job() -> None:
    db = SessionLocal()
    try:
        send_monthly_birthday_greetings(db, get_email_sender(), eastern_today().month)
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
        # Heure serveur (UTC) ~ matinée à l'Est ; la comparaison de date elle-même
        # se fait toujours en heure de l'Est (zoneinfo) dans birthday_service.
        _scheduler.add_job(
            _run_birthday_daily_job, "cron", hour=13, minute=0, id="birthday_daily"
        )
        _scheduler.add_job(
            _run_birthday_monthly_job,
            "cron",
            day=1,
            hour=13,
            minute=5,
            id="birthday_monthly",
        )
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
app.include_router(ministry_affiliations.router)
app.include_router(donations.router)
app.include_router(sermons.router)
app.include_router(events.router)
app.include_router(leaders.router)
app.include_router(posts.router)
app.include_router(news.router)
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
