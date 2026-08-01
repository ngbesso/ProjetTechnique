from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.donor import Donor


def search_donors(db: Session, q: str | None = None, limit: int = 20) -> list[Donor]:
    query = select(Donor)
    if q:
        term = f"%{q}%"
        query = query.where(or_(Donor.name.ilike(term), Donor.email.ilike(term)))
    return db.scalars(query.order_by(Donor.name).limit(limit)).all()


def get_or_create_donor(db: Session, name: str, email: str | None = None) -> Donor:
    """Réutilise un donateur existant (par courriel, sinon par nom exact,
    insensible à la casse) au lieu d'en créer un doublon silencieux."""
    existing: Donor | None = None
    if email:
        existing = db.scalar(
            select(Donor).where(func.lower(Donor.email) == email.lower())
        )
    if existing is None:
        existing = db.scalar(
            select(Donor).where(func.lower(Donor.name) == name.lower())
        )
    if existing is not None:
        return existing

    donor = Donor(name=name, email=email)
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return donor
