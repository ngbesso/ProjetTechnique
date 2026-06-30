from app.models.donation import Donation


def create_donation(db, payload, member_id=None, donor_name=None, donor_email=None):
    donation = Donation(
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        donor_name=donor_name or payload.donor_name,
        donor_email=donor_email or payload.donor_email,
        member_id=member_id,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


def get_donation(db, donation_id):
    return db.query(Donation).filter(Donation.id == donation_id).first()


def get_all_donations(db):
    return db.query(Donation).all()


def get_member_donations(db, member_id):
    return db.query(Donation).filter(Donation.member_id == member_id).all()
