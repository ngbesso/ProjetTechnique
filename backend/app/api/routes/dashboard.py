from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.church import Church
from app.models.donation import Donation, DonationCurrency
from app.models.member import Member, MemberStatus
from app.models.sermon import Sermon, SermonStatus
from app.models.user import User
from app.schemas.dashboard import (
    ChurchStats,
    DashboardStats,
    DonationStats,
    MemberStats,
    MonthAmount,
    MonthCount,
    PendingMemberItem,
    SermonStats,
)

router = APIRouter(prefix="/admin", tags=["dashboard"])

MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
             "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]


def _six_months() -> list[tuple[int, int, str]]:
    today = date.today()
    result = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        result.append((y, m, MONTHS_FR[m - 1]))
    return result


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardStats:
    # ── Membres ──────────────────────────────────────────────────────────────
    status_rows = db.execute(
        select(Member.status, func.count(Member.id)).group_by(Member.status)
    ).all()
    status_map: dict[str, int] = {r[0]: r[1] for r in status_rows}

    members_by_month: list[MonthCount] = []
    for y, m, label in _six_months():
        cnt = db.scalar(
            select(func.count(Member.id)).where(
                func.extract("year", Member.created_at) == y,
                func.extract("month", Member.created_at) == m,
            )
        ) or 0
        members_by_month.append(MonthCount(month=label, count=cnt))

    total_members = sum(status_map.values())

    membre_stats = MemberStats(
        total=total_members,
        active=status_map.get(MemberStatus.active, 0),
        pending=status_map.get(MemberStatus.pending, 0),
        inactive=status_map.get(MemberStatus.inactive, 0),
        rejected=status_map.get(MemberStatus.rejected, 0),
        by_month=members_by_month,
    )

    # ── Églises ───────────────────────────────────────────────────────────────
    church_total = db.scalar(select(func.count(Church.id))) or 0
    church_affiliates = db.scalar(
        select(func.count(Church.id)).where(Church.parent_id.isnot(None))
    ) or 0

    eglise_stats = ChurchStats(total=church_total, affiliates=church_affiliates)

    # ── Dons ─────────────────────────────────────────────────────────────────
    don_rows = db.execute(
        select(Donation.currency, func.sum(Donation.amount)).group_by(Donation.currency)
    ).all()
    total_cad = 0.0
    total_usd = 0.0
    for currency, total in don_rows:
        if currency == DonationCurrency.CAD:
            total_cad = float(total or 0)
        elif currency == DonationCurrency.USD:
            total_usd = float(total or 0)

    don_count = db.scalar(select(func.count(Donation.id))) or 0

    cat_rows = db.execute(
        select(Donation.category, func.sum(Donation.amount)).group_by(Donation.category)
    ).all()
    by_category: dict[str, float] = {r[0]: float(r[1] or 0) for r in cat_rows}

    dons_by_month: list[MonthAmount] = []
    for y, m, label in _six_months():
        amt = db.scalar(
            select(func.sum(Donation.amount)).where(
                Donation.currency == DonationCurrency.CAD,
                func.extract("year", Donation.created_at) == y,
                func.extract("month", Donation.created_at) == m,
            )
        ) or 0
        dons_by_month.append(MonthAmount(month=label, amount=float(amt)))

    don_stats = DonationStats(
        total_cad=total_cad,
        total_usd=total_usd,
        count=don_count,
        by_category=by_category,
        by_month=dons_by_month,
    )

    # ── Sermons ───────────────────────────────────────────────────────────────
    sermon_rows = db.execute(
        select(Sermon.status, func.count(Sermon.id)).group_by(Sermon.status)
    ).all()
    sermon_map: dict[str, int] = {r[0]: r[1] for r in sermon_rows}

    sermon_stats = SermonStats(
        total=sum(sermon_map.values()),
        published=sermon_map.get(SermonStatus.published, 0),
        draft=sermon_map.get(SermonStatus.draft, 0),
        archived=sermon_map.get(SermonStatus.archived, 0),
    )

    # ── Membres en attente récents ────────────────────────────────────────────
    pending_members = db.scalars(
        select(Member)
        .where(Member.status == MemberStatus.pending)
        .order_by(Member.created_at.desc())
        .limit(5)
    ).all()

    recent_pending = [
        PendingMemberItem(
            id=m.id,
            first_name=m.first_name,
            last_name=m.last_name,
            email=m.email,
            created_at=m.created_at.strftime("%Y-%m-%d"),
        )
        for m in pending_members
    ]

    return DashboardStats(
        membres=membre_stats,
        eglises=eglise_stats,
        dons=don_stats,
        sermons=sermon_stats,
        recent_pending=recent_pending,
    )
