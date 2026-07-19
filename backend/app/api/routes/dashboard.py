from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.donation import Donation
from app.models.event import Event, EventRegistration, RegistrationStatus
from app.models.member import Member, MemberStatus
from app.models.post import Post, PostStatus
from app.models.prayer_request import PrayerRequest, PrayerRequestStatus
from app.models.sermon import Sermon, SermonStatus
from app.models.user import User
from app.models.volunteer_request import VolunteerRequest, VolunteerRequestStatus
from app.schemas.dashboard import (
    ActivityItem,
    DashboardStats,
    PrayerAlertItem,
    PrayerAlertStats,
    VolunteerAlertItem,
    VolunteerAlertStats,
)

router = APIRouter(prefix="/admin", tags=["dashboard"])

_RECENT_LIMIT = 5
_ACTIVITY_PER_SOURCE = 10
_ACTIVITY_TOTAL = 10


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardStats:
    # ── Membres en attente ───────────────────────────────────────────────────
    membres_pending_count = (
        db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.status == MemberStatus.pending)
        )
        or 0
    )

    # ── Demandes de prière ───────────────────────────────────────────────────
    prayer_pending_count = (
        db.scalar(
            select(func.count())
            .select_from(PrayerRequest)
            .where(PrayerRequest.status == PrayerRequestStatus.new)
        )
        or 0
    )
    prayer_recent_rows = db.scalars(
        select(PrayerRequest)
        .options(selectinload(PrayerRequest.member))
        .where(PrayerRequest.status == PrayerRequestStatus.new)
        .order_by(PrayerRequest.created_at.desc())
        .limit(_RECENT_LIMIT)
    ).all()
    prieres = PrayerAlertStats(
        pending=prayer_pending_count,
        recent=[
            PrayerAlertItem(
                id=p.id,
                member_name=p.member.full_name if p.member else "—",
                created_at=p.created_at.isoformat(),
            )
            for p in prayer_recent_rows
        ],
    )

    # ── Demandes de bénévolat ────────────────────────────────────────────────
    volunteer_pending_count = (
        db.scalar(
            select(func.count())
            .select_from(VolunteerRequest)
            .where(VolunteerRequest.status == VolunteerRequestStatus.pending)
        )
        or 0
    )
    volunteer_recent_rows = db.scalars(
        select(VolunteerRequest)
        .options(
            selectinload(VolunteerRequest.member), selectinload(VolunteerRequest.event)
        )
        .where(VolunteerRequest.status == VolunteerRequestStatus.pending)
        .order_by(VolunteerRequest.created_at.desc())
        .limit(_RECENT_LIMIT)
    ).all()
    benevolat = VolunteerAlertStats(
        pending=volunteer_pending_count,
        recent=[
            VolunteerAlertItem(
                id=v.id,
                member_name=v.member.full_name if v.member else "—",
                event_title=v.event.title if v.event else "—",
                created_at=v.created_at.isoformat(),
            )
            for v in volunteer_recent_rows
        ],
    )

    # ── Activité récente (union de tous les modules, triée par date) ────────
    activity: list[tuple[datetime, ActivityItem]] = []

    for m in db.scalars(
        select(Member).order_by(Member.created_at.desc()).limit(_ACTIVITY_PER_SOURCE)
    ).all():
        activity.append((
            m.created_at,
            ActivityItem(
                type="member",
                label=f"Nouveau membre : {m.first_name} {m.last_name}",
                date=m.created_at.isoformat(),
            ),
        ))

    for d in db.scalars(
        select(Donation).order_by(Donation.created_at.desc()).limit(_ACTIVITY_PER_SOURCE)
    ).all():
        donor = d.donor_name or d.donor_email or "Anonyme"
        activity.append((
            d.created_at,
            ActivityItem(
                type="donation",
                label=f"Don reçu : {float(d.amount):.2f} $ {d.currency.value} de {donor}",
                date=d.created_at.isoformat(),
            ),
        ))

    for s in db.scalars(
        select(Sermon)
        .where(Sermon.status == SermonStatus.published)
        .order_by(Sermon.created_at.desc())
        .limit(_ACTIVITY_PER_SOURCE)
    ).all():
        activity.append((
            s.created_at,
            ActivityItem(
                type="sermon",
                label=f"Sermon publié : {s.title}",
                date=s.created_at.isoformat(),
            ),
        ))

    for p in db.scalars(
        select(Post)
        .where(Post.status == PostStatus.published)
        .order_by(Post.created_at.desc())
        .limit(_ACTIVITY_PER_SOURCE)
    ).all():
        activity.append((
            p.created_at,
            ActivityItem(
                type="post",
                label=f"Article publié : {p.title}",
                date=p.created_at.isoformat(),
            ),
        ))

    reg_rows = db.execute(
        select(EventRegistration, Event)
        .join(Event, Event.id == EventRegistration.event_id)
        .where(EventRegistration.status == RegistrationStatus.confirmed)
        .order_by(EventRegistration.registered_at.desc())
        .limit(_ACTIVITY_PER_SOURCE)
    ).all()
    for reg, event in reg_rows:
        activity.append((
            reg.registered_at,
            ActivityItem(
                type="event_registration",
                label=(
                    f"Inscription à « {event.title} » par "
                    f"{reg.first_name} {reg.last_name}"
                ),
                date=reg.registered_at.isoformat(),
            ),
        ))

    for pr in db.scalars(
        select(PrayerRequest)
        .options(selectinload(PrayerRequest.member))
        .order_by(PrayerRequest.created_at.desc())
        .limit(_ACTIVITY_PER_SOURCE)
    ).all():
        activity.append((
            pr.created_at,
            ActivityItem(
                type="prayer_request",
                label=(
                    "Nouvelle demande de prière de "
                    f"{pr.member.full_name if pr.member else '—'}"
                ),
                date=pr.created_at.isoformat(),
            ),
        ))

    for vr in db.scalars(
        select(VolunteerRequest)
        .options(
            selectinload(VolunteerRequest.member), selectinload(VolunteerRequest.event)
        )
        .order_by(VolunteerRequest.created_at.desc())
        .limit(_ACTIVITY_PER_SOURCE)
    ).all():
        activity.append((
            vr.created_at,
            ActivityItem(
                type="volunteer_request",
                label=(
                    "Nouvelle demande de bénévolat de "
                    f"{vr.member.full_name if vr.member else '—'} pour "
                    f"« {vr.event.title if vr.event else '—'} »"
                ),
                date=vr.created_at.isoformat(),
            ),
        ))

    activity.sort(key=lambda item: item[0], reverse=True)
    recent_activity = [item for _, item in activity[:_ACTIVITY_TOTAL]]

    return DashboardStats(
        membres_pending=membres_pending_count,
        prieres=prieres,
        benevolat=benevolat,
        recent_activity=recent_activity,
    )
