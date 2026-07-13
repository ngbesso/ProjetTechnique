from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, get_current_user, require_global_permission
from app.core.email import (
    EmailSender,
    formation_registration_received,
    get_email_sender,
)
from app.db.session import get_db
from app.models.formation import Formation, FormationRegistration, FormationStatus
from app.models.member import Member
from app.models.user import User
from app.schemas.formation import (
    FormationCreate,
    FormationList,
    FormationRead,
    FormationSummary,
    FormationUpdate,
    RegistrationCreate,
    RegistrationRead,
    RegistrationWithFormation,
)

MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _format_date_fr(d: date) -> str:
    return f"{d.day} {MONTHS_FR[d.month - 1]} {d.year}"


def _format_price(price: float) -> str:
    return "Gratuit" if float(price) == 0 else f"{float(price):.2f} $ CAD"

router = APIRouter(prefix="/formations", tags=["formations"])
can_manage = Depends(require_global_permission("formation:manage"))


def _load(db: Session, formation_id: int) -> Formation:
    formation = db.get(Formation, formation_id)
    if not formation:
        raise HTTPException(404, "Formation introuvable")
    return formation


def _attach_counts(db: Session, formations: list[Formation]) -> list[Formation]:
    """Attache registered_count à chaque formation (une seule requête)."""
    ids = [f.id for f in formations]
    counts: dict[int, int] = {}
    if ids:
        rows = db.execute(
            select(FormationRegistration.formation_id, func.count())
            .where(FormationRegistration.formation_id.in_(ids))
            .group_by(FormationRegistration.formation_id)
        ).all()
        counts = {fid: cnt for fid, cnt in rows}
    for f in formations:
        f.registered_count = counts.get(f.id, 0)
    return formations


@router.get("", response_model=FormationList)
def list_formations(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    upcoming: bool = False,
    available: bool = False,
    limit: int = 20,
    offset: int = 0,
):
    """Liste publique — formations publiées uniquement."""
    query = select(Formation).where(Formation.status == FormationStatus.published)
    if q:
        term = f"%{q}%"
        query = query.where(
            Formation.title.ilike(term)
            | Formation.instructor.ilike(term)
            | Formation.description.ilike(term)
        )
    if upcoming:
        query = query.where(Formation.formation_date >= date.today())
    if available:
        reg_count = (
            select(func.count())
            .where(FormationRegistration.formation_id == Formation.id)
            .scalar_subquery()
        )
        query = query.where(reg_count < Formation.capacity)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(Formation.formation_date.asc()).limit(limit).offset(offset)
    ).all()
    items = _attach_counts(db, list(rows))
    return FormationList(items=items, total=total or 0, limit=limit, offset=offset)


@router.get("/admin", response_model=FormationList, dependencies=[can_manage])
def list_formations_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: FormationStatus | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """Liste toutes les formations avec filtres — réservé aux gestionnaires."""
    query = select(Formation)
    if q:
        term = f"%{q}%"
        query = query.where(
            Formation.title.ilike(term) | Formation.instructor.ilike(term)
        )
    if status:
        query = query.where(Formation.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(Formation.formation_date.desc()).limit(limit).offset(offset)
    ).all()
    items = _attach_counts(db, list(rows))
    return FormationList(items=items, total=total or 0, limit=limit, offset=offset)


@router.get("/registrations/me", response_model=list[RegistrationWithFormation])
def list_my_registrations(
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Inscriptions aux formations du membre connecté (appariées par courriel)."""
    rows = db.execute(
        select(FormationRegistration, Formation)
        .join(Formation, Formation.id == FormationRegistration.formation_id)
        .where(func.lower(FormationRegistration.email) == current_member.email.lower())
        .order_by(Formation.formation_date.desc())
    ).all()
    return [
        RegistrationWithFormation(
            id=reg.id,
            formation_id=reg.formation_id,
            created_at=reg.created_at,
            formation=FormationSummary.model_validate(formation),
        )
        for reg, formation in rows
    ]


@router.get("/{formation_id}", response_model=FormationRead)
def get_formation(formation_id: int, db: Annotated[Session, Depends(get_db)]):
    formation = _load(db, formation_id)
    if formation.status != FormationStatus.published:
        raise HTTPException(404, "Formation introuvable")
    return _attach_counts(db, [formation])[0]


@router.post(
    "/{formation_id}/register",
    response_model=RegistrationRead,
    status_code=201,
)
def register_to_formation(
    formation_id: int,
    data: RegistrationCreate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Inscription publique à une formation publiée et à venir."""
    formation = _load(db, formation_id)
    if formation.status != FormationStatus.published:
        raise HTTPException(404, "Formation introuvable")
    if formation.formation_date < date.today():
        raise HTTPException(409, "Cette formation est déjà passée")

    email = data.email.lower()
    already = db.scalar(
        select(FormationRegistration).where(
            FormationRegistration.formation_id == formation_id,
            func.lower(FormationRegistration.email) == email,
        )
    )
    if already:
        raise HTTPException(409, "Vous êtes déjà inscrit(e) à cette formation")

    count = (
        db.scalar(
            select(func.count()).where(
                FormationRegistration.formation_id == formation_id
            )
        )
        or 0
    )
    if count >= formation.capacity:
        raise HTTPException(409, "Cette formation est complète")

    registration = FormationRegistration(
        formation_id=formation_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=email,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    background.add_task(
        formation_registration_received,
        sender,
        registration.email,
        registration.first_name,
        formation.title,
        _format_date_fr(formation.formation_date),
        formation.instructor,
        _format_price(formation.price),
    )
    return registration


@router.get(
    "/{formation_id}/registrations",
    response_model=list[RegistrationRead],
    dependencies=[can_manage],
)
def list_registrations(formation_id: int, db: Annotated[Session, Depends(get_db)]):
    """Liste des inscrits à une formation — réservé aux gestionnaires."""
    _load(db, formation_id)
    rows = db.scalars(
        select(FormationRegistration)
        .where(FormationRegistration.formation_id == formation_id)
        .order_by(FormationRegistration.created_at.asc())
    ).all()
    return list(rows)


@router.post(
    "", response_model=FormationRead, status_code=201, dependencies=[can_manage]
)
def create_formation(
    data: FormationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    formation = Formation(**data.model_dump(), created_by=current_user.id)
    db.add(formation)
    db.commit()
    db.refresh(formation)
    return formation


@router.patch(
    "/{formation_id}", response_model=FormationRead, dependencies=[can_manage]
)
def update_formation(
    formation_id: int, data: FormationUpdate, db: Annotated[Session, Depends(get_db)]
):
    formation = _load(db, formation_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(formation, k, v)
    db.commit()
    db.refresh(formation)
    return _attach_counts(db, [formation])[0]


@router.delete("/{formation_id}", status_code=204, dependencies=[can_manage])
def delete_formation(formation_id: int, db: Annotated[Session, Depends(get_db)]):
    formation = _load(db, formation_id)
    db.delete(formation)
    db.commit()
