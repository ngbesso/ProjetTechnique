from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_current_member
from app.core.config import settings
from app.db.session import get_db
from app.models.church import Church
from app.models.donation import Donation, DonationCategory, DonationCurrency
from app.schemas.donation import (
    CategoryCount,
    DonationAdminStats,
    DonationCreate,
    DonationRead,
    ReceiptRead,
    TopChurchItem,
    TopDonorItem,
)
from app.services import donation_service

router = APIRouter(prefix="/api/donations", tags=["donations"])


def _get_church_or_404(db: Session, church_id: int) -> Church:
    church = db.get(Church, church_id)
    if church is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Église introuvable"
        )
    return church


@router.post("/webhooks/zeffy", status_code=status.HTTP_200_OK)
def zeffy_webhook(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
):
    """Reçoit les notifications du webhook natif Zeffy (Réglages > Intégrations).

    Zeffy attend un 2xx pour confirmer la réception, sinon il retente la
    livraison. On vérifie un secret partagé passé en paramètre d'URL, faute
    de signature documentée par Zeffy.
    """
    if not settings.zeffy_webhook_secret or (
        request.query_params.get("secret") != settings.zeffy_webhook_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Secret invalide"
        )

    event = payload.get("event")
    if event != "payment.completed":
        return {"status": "ignored"}

    payment = payload.get("payment") or {}
    payment_reference = str(payment.get("id") or "")
    if not payment_reference:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="payment.id manquant"
        )

    existing = donation_service.get_by_payment_reference(db, payment_reference)
    if existing:
        return {"status": "duplicate", "donation_id": existing.id}

    amount = payment.get("amount")
    if not isinstance(amount, (int, float)) or amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="payment.amount invalide"
        )

    currency = str(payment.get("currency", "CAD")).upper()
    if currency not in ("CAD", "USD"):
        currency = "CAD"

    buyer = payment.get("buyer") or {}
    donor_name = (
        buyer.get("name")
        or " ".join(filter(None, [buyer.get("firstName"), buyer.get("lastName")]))
        or None
    )
    donor_email = buyer.get("email")

    donation = donation_service.create_from_zeffy(
        db,
        amount=round(float(amount), 2),
        currency=currency,
        payment_reference=payment_reference,
        donor_name=donor_name,
        donor_email=donor_email,
    )
    return {"status": "created", "donation_id": donation.id}


@router.post("/", response_model=DonationRead, status_code=status.HTTP_201_CREATED)
def create_donation(
    payload: DonationCreate,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Crée un don direct (hors ligne de paiement). Nécessite d'être membre."""
    _get_church_or_404(db, payload.church_id)

    return donation_service.create_donation(
        db,
        payload,
        member_id=current_member.id,
        donor_name=current_member.full_name,
        donor_email=current_member.email,
    )


@router.get("/", response_model=list[DonationRead])
def list_donations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    q: str | None = None,
    payment_status: str | None = None,
    category: str | None = None,
    currency: str | None = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Liste tous les dons avec filtres — réservé aux administrateurs."""
    query = select(Donation)
    if q:
        term = f"%{q}%"
        query = query.where(
            or_(
                Donation.donor_name.ilike(term),
                Donation.donor_email.ilike(term),
                Donation.receipt_number.ilike(term),
            )
        )
    if payment_status:
        query = query.where(Donation.payment_status == payment_status)
    if category:
        query = query.where(Donation.category == category)
    if currency:
        query = query.where(Donation.currency == currency)
    return db.scalars(
        query.order_by(Donation.created_at.desc()).offset(skip).limit(limit)
    ).all()


@router.get("/admin/stats", response_model=DonationAdminStats)
def get_donations_stats(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Montant total, répartition par catégorie, top 5 donateurs et top 5 églises."""
    donations = db.scalars(
        select(Donation).options(selectinload(Donation.member))
    ).all()

    total_cad = sum(
        float(d.amount) for d in donations if d.currency == DonationCurrency.CAD
    )
    total_usd = sum(
        float(d.amount) for d in donations if d.currency == DonationCurrency.USD
    )

    cat_counts: dict[DonationCategory, int] = {c: 0 for c in DonationCategory}
    for d in donations:
        if d.category:
            cat_counts[d.category] += 1
    by_category = [
        CategoryCount(category=c.value, count=cat_counts[c]) for c in DonationCategory
    ]

    donor_totals: dict[str, dict] = {}
    for d in donations:
        if d.member_id and d.member:
            key = f"member:{d.member_id}"
            name = d.member.full_name
        else:
            name = d.donor_name or d.donor_email or "Anonyme"
            key = f"name:{name.lower()}"
        entry = donor_totals.setdefault(key, {"name": name, "total": 0.0, "count": 0})
        entry["total"] += float(d.amount)
        entry["count"] += 1
    top_donors = [
        TopDonorItem(name=x["name"], total=x["total"], count=x["count"])
        for x in sorted(donor_totals.values(), key=lambda x: x["total"], reverse=True)[:5]
    ]

    church_totals: dict[int, float] = {}
    for d in donations:
        if d.church_id:
            church_totals[d.church_id] = church_totals.get(d.church_id, 0.0) + float(d.amount)
    top_church_ids = sorted(church_totals, key=lambda cid: church_totals[cid], reverse=True)[:5]
    churches = (
        db.scalars(select(Church).where(Church.id.in_(top_church_ids))).all()
        if top_church_ids
        else []
    )
    church_name_map = {c.id: c.name for c in churches}
    top_churches = [
        TopChurchItem(
            church_id=cid,
            church_name=church_name_map.get(cid, "—"),
            total=church_totals[cid],
        )
        for cid in top_church_ids
    ]

    return DonationAdminStats(
        total_cad=total_cad,
        total_usd=total_usd,
        by_category=by_category,
        top_donors=top_donors,
        top_churches=top_churches,
    )


@router.get("/me", response_model=list[DonationRead])
def list_my_donations(
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Liste les dons du membre connecté."""
    return donation_service.list_by_member(db, current_member.id)


@router.get("/{donation_id}", response_model=DonationRead)
def get_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Retourne un don. Le membre ne peut accéder qu'à ses propres dons."""
    donation = donation_service.get_donation(db, donation_id)
    if donation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Don introuvable"
        )

    if donation.member_id != current_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit"
        )

    return donation


@router.get("/{donation_id}/recu", response_model=ReceiptRead)
def get_receipt(
    donation_id: int,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Retourne le reçu fiscal d'un don."""
    donation = donation_service.get_donation(db, donation_id)
    if donation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Don introuvable"
        )

    if donation.member_id != current_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit"
        )

    return ReceiptRead(
        receipt_number=donation.receipt_number,
        amount=float(donation.amount),
        currency=donation.currency,
        category=donation.category,
        church_id=donation.church_id,
        donor_name=donation.donor_name or current_member.full_name,
        donor_email=donation.donor_email,
        created_at=donation.created_at,
    )
