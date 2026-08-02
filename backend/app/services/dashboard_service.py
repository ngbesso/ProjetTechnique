"""Agrégation en lecture seule du tableau de bord.

Regroupe les comptages d'alerte (membres en attente, prières et bénévolat non
traités) et la collecte d'activité récente, qui balaie tous les modules. Aucune
écriture : le module ne fait que lire.
"""

from collections.abc import Callable
from datetime import datetime
from typing import TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.donation import Donation
from app.models.event import Event, EventRegistration, RegistrationStatus
from app.models.member import Member, MemberStatus
from app.models.post import Post, PostStatus
from app.models.prayer_request import PrayerRequest, PrayerRequestStatus
from app.models.sermon import Sermon, SermonStatus
from app.models.volunteer_request import VolunteerRequest, VolunteerRequestStatus
from app.schemas.dashboard import (
    ActivityItem,
    DashboardStats,
    PrayerAlertItem,
    PrayerAlertStats,
    VolunteerAlertItem,
    VolunteerAlertStats,
)

_RECENT_LIMIT = 5
_ACTIVITY_PER_SOURCE = 10
_ACTIVITY_TOTAL = 10

RowT = TypeVar("RowT")


def _collect_activity(
    db: Session,
    stmt: Select[tuple[RowT]],
    type_: str,
    label_fn: Callable[[RowT], str],
    limit: int,
) -> list[tuple[datetime, ActivityItem]]:
    """Exécute `stmt` (déjà filtrée/triée par date décroissante) et construit
    les ActivityItem correspondants — factorise le schéma répété par les
    différentes sources d'activité (select -> ActivityItem à partir de
    row.created_at)."""
    rows = db.scalars(stmt.limit(limit)).all()
    return [
        (
            row.created_at,
            ActivityItem(type=type_, label=label_fn(row), date=row.created_at.isoformat()),
        )
        for row in rows
    ]


def count_pending_members(db: Session) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.status == MemberStatus.pending)
        )
        or 0
    )


def get_prayer_alerts(db: Session) -> PrayerAlertStats:
    pending = (
        db.scalar(
            select(func.count())
            .select_from(PrayerRequest)
            .where(PrayerRequest.status == PrayerRequestStatus.new)
        )
        or 0
    )
    recent_rows = db.scalars(
        select(PrayerRequest)
        .options(selectinload(PrayerRequest.member))
        .where(PrayerRequest.status == PrayerRequestStatus.new)
        .order_by(PrayerRequest.created_at.desc())
        .limit(_RECENT_LIMIT)
    ).all()
    return PrayerAlertStats(
        pending=pending,
        recent=[
            PrayerAlertItem(
                id=p.id,
                member_name=p.member.full_name if p.member else "—",
                created_at=p.created_at.isoformat(),
            )
            for p in recent_rows
        ],
    )


def get_volunteer_alerts(db: Session) -> VolunteerAlertStats:
    pending = (
        db.scalar(
            select(func.count())
            .select_from(VolunteerRequest)
            .where(VolunteerRequest.status == VolunteerRequestStatus.pending)
        )
        or 0
    )
    recent_rows = db.scalars(
        select(VolunteerRequest)
        .options(
            selectinload(VolunteerRequest.member), selectinload(VolunteerRequest.event)
        )
        .where(VolunteerRequest.status == VolunteerRequestStatus.pending)
        .order_by(VolunteerRequest.created_at.desc())
        .limit(_RECENT_LIMIT)
    ).all()
    return VolunteerAlertStats(
        pending=pending,
        recent=[
            VolunteerAlertItem(
                id=v.id,
                member_name=v.member.full_name if v.member else "—",
                event_title=v.event.title if v.event else "—",
                created_at=v.created_at.isoformat(),
            )
            for v in recent_rows
        ],
    )


def get_recent_activity(db: Session) -> list[ActivityItem]:
    """Union de l'activité de tous les modules, triée par date décroissante et
    tronquée aux `_ACTIVITY_TOTAL` entrées les plus récentes."""
    activity: list[tuple[datetime, ActivityItem]] = []

    activity += _collect_activity(
        db,
        select(Member).order_by(Member.created_at.desc()),
        "member",
        lambda m: f"Nouveau membre : {m.first_name} {m.last_name}",
        _ACTIVITY_PER_SOURCE,
    )

    activity += _collect_activity(
        db,
        select(Donation).order_by(Donation.created_at.desc()),
        "donation",
        lambda d: (
            f"Don reçu : {float(d.amount):.2f} $ {d.currency.value} de "
            f"{d.donor_name or d.donor_email or 'Anonyme'}"
        ),
        _ACTIVITY_PER_SOURCE,
    )

    activity += _collect_activity(
        db,
        select(Sermon)
        .where(Sermon.status == SermonStatus.published)
        .order_by(Sermon.created_at.desc()),
        "sermon",
        lambda s: f"Sermon publié : {s.title}",
        _ACTIVITY_PER_SOURCE,
    )

    activity += _collect_activity(
        db,
        select(Post)
        .where(Post.status == PostStatus.published)
        .order_by(Post.created_at.desc()),
        "post",
        lambda p: f"Article publié : {p.title}",
        _ACTIVITY_PER_SOURCE,
    )

    # Les inscriptions n'ont pas de created_at et le libellé a besoin de
    # l'événement joint : elles ne rentrent pas dans _collect_activity.
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

    activity += _collect_activity(
        db,
        select(PrayerRequest)
        .options(selectinload(PrayerRequest.member))
        .order_by(PrayerRequest.created_at.desc()),
        "prayer_request",
        lambda pr: (
            f"Nouvelle demande de prière de {pr.member.full_name if pr.member else '—'}"
        ),
        _ACTIVITY_PER_SOURCE,
    )

    activity += _collect_activity(
        db,
        select(VolunteerRequest)
        .options(
            selectinload(VolunteerRequest.member), selectinload(VolunteerRequest.event)
        )
        .order_by(VolunteerRequest.created_at.desc()),
        "volunteer_request",
        lambda vr: (
            f"Nouvelle demande de bénévolat de {vr.member.full_name if vr.member else '—'} pour "
            f"« {vr.event.title if vr.event else '—'} »"
        ),
        _ACTIVITY_PER_SOURCE,
    )

    activity.sort(key=lambda item: item[0], reverse=True)
    return [item for _, item in activity[:_ACTIVITY_TOTAL]]


def get_dashboard_stats(db: Session) -> DashboardStats:
    return DashboardStats(
        membres_pending=count_pending_members(db),
        prieres=get_prayer_alerts(db),
        benevolat=get_volunteer_alerts(db),
        recent_activity=get_recent_activity(db),
    )
