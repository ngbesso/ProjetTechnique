import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.church import Church
from app.models.donation import Donation


BASE = "/api/donations"
WEBHOOK_SECRET = "test-zeffy-secret"


# ── fixtures / helpers ────────────────────────────────────────────────────────


def _payload(church_id: int) -> dict:
    return {
        "amount": 50.0,
        "currency": "CAD",
        "category": "soutien_spirituel",
        "church_id": church_id,
    }


# ── POST /api/donations/ ──────────────────────────────────────────────────────


def test_create_donation_requires_auth(client, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    r = client.post(f"{BASE}/", json=_payload(church_id))
    assert r.status_code == 401


def test_create_donation_success(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("donor@b.com", church_id)
    r = client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("donor@b.com")
    )
    assert r.status_code == 201
    body = r.json()
    assert body["amount"] == 50.0
    assert body["currency"] == "CAD"
    assert body["receipt_number"].startswith("REC-")


def test_create_donation_unknown_church(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("donor2@b.com", church_id)
    r = client.post(
        f"{BASE}/",
        json=_payload(999999),
        headers=auth_header("donor2@b.com"),
    )
    assert r.status_code == 404


def test_create_donation_zero_amount(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("donor3@b.com", church_id)
    payload = _payload(church_id)
    payload["amount"] = 0
    r = client.post(f"{BASE}/", json=payload, headers=auth_header("donor3@b.com"))
    assert r.status_code == 422


# ── GET /api/donations/me ─────────────────────────────────────────────────────


def test_list_my_donations(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("me@b.com", church_id)
    h = auth_header("me@b.com")
    client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    r = client.get(f"{BASE}/me", headers=h)
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_list_my_donations_requires_auth(client):
    assert client.get(f"{BASE}/me").status_code == 401


# ── GET /api/donations/{id} ───────────────────────────────────────────────────


def test_get_donation(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("getdon@b.com", church_id)
    h = auth_header("getdon@b.com")
    donation_id = client.post(f"{BASE}/", json=_payload(church_id), headers=h).json()[
        "id"
    ]
    r = client.get(f"{BASE}/{donation_id}", headers=h)
    assert r.status_code == 200
    assert r.json()["id"] == donation_id


def test_get_donation_other_member_forbidden(
    client, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("owner@b.com", church_id)
    make_member("intruder@b.com", church_id)
    donation_id = client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("owner@b.com")
    ).json()["id"]
    r = client.get(f"{BASE}/{donation_id}", headers=auth_header("intruder@b.com"))
    assert r.status_code == 403


def test_get_donation_not_found(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("nfdon@b.com", church_id)
    r = client.get(f"{BASE}/999999", headers=auth_header("nfdon@b.com"))
    assert r.status_code == 404


# ── GET /api/donations/{id}/recu ──────────────────────────────────────────────


def test_get_receipt(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("recu@b.com", church_id)
    h = auth_header("recu@b.com")
    donation_id = client.post(f"{BASE}/", json=_payload(church_id), headers=h).json()[
        "id"
    ]
    r = client.get(f"{BASE}/{donation_id}/recu", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "receipt_number" in body
    assert body["amount"] == 50.0
    assert body["donor_email"] == "recu@b.com"


# ── GET /api/donations/ (admin) ───────────────────────────────────────────────


def test_list_all_requires_admin(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("plain2@b.com", church_id)
    r = client.get(f"{BASE}/", headers=auth_header("plain2@b.com"))
    assert r.status_code == 403


def test_admin_can_list_all_donations(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_user("admin@b.com", roles=["admin"])
    make_member("donor4@b.com", church_id)
    client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("donor4@b.com")
    )
    r = client.get(f"{BASE}/", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ── POST /api/donations/webhooks/zeffy ────────────────────────────────────────


def _zeffy_payload(payment_id="zeffy-pay-1", amount=42.5, currency="CAD"):
    return {
        "event": "payment.completed",
        "payment": {
            "id": payment_id,
            "amount": amount,
            "currency": currency,
            "buyer": {
                "firstName": "Jean",
                "lastName": "Dupont",
                "email": "jean@ex.com",
            },
        },
    }


@pytest.fixture(autouse=True)
def _zeffy_secret(monkeypatch):
    monkeypatch.setattr(settings, "zeffy_webhook_secret", WEBHOOK_SECRET)


def test_zeffy_webhook_wrong_secret(client):
    r = client.post(f"{BASE}/webhooks/zeffy", json=_zeffy_payload())
    assert r.status_code == 401

    r = client.post(f"{BASE}/webhooks/zeffy?secret=wrong", json=_zeffy_payload())
    assert r.status_code == 401


def test_zeffy_webhook_creates_donation(client, db_session):
    r = client.post(
        f"{BASE}/webhooks/zeffy?secret={WEBHOOK_SECRET}", json=_zeffy_payload()
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "created"

    donation = db_session.get(Donation, body["donation_id"])
    assert donation.amount == 42.5
    assert donation.currency == "CAD"
    assert donation.church_id is None
    assert donation.category is None
    assert donation.member_id is None
    assert donation.donor_name == "Jean Dupont"
    assert donation.donor_email == "jean@ex.com"
    assert donation.payment_reference == "zeffy-pay-1"
    assert donation.payment_status == "succeeded"
    assert donation.receipt_number.startswith("REC-")


def test_zeffy_webhook_ignores_other_events(client, db_session):
    payload = _zeffy_payload()
    payload["event"] = "payment.refunded"
    r = client.post(f"{BASE}/webhooks/zeffy?secret={WEBHOOK_SECRET}", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "ignored"


def test_zeffy_webhook_is_idempotent(client, db_session):
    payload = _zeffy_payload(payment_id="zeffy-pay-dup")
    r1 = client.post(f"{BASE}/webhooks/zeffy?secret={WEBHOOK_SECRET}", json=payload)
    r2 = client.post(f"{BASE}/webhooks/zeffy?secret={WEBHOOK_SECRET}", json=payload)
    assert r1.json()["status"] == "created"
    assert r2.json()["status"] == "duplicate"
    assert r1.json()["donation_id"] == r2.json()["donation_id"]

    count = (
        db_session.query(Donation)
        .filter(Donation.payment_reference == "zeffy-pay-dup")
        .count()
    )
    assert count == 1


def test_zeffy_webhook_missing_payment_id(client):
    payload = _zeffy_payload()
    payload["payment"].pop("id")
    r = client.post(f"{BASE}/webhooks/zeffy?secret={WEBHOOK_SECRET}", json=payload)
    assert r.status_code == 400


def test_zeffy_webhook_invalid_amount(client):
    payload = _zeffy_payload(payment_id="zeffy-pay-bad-amount")
    payload["payment"]["amount"] = -5
    r = client.post(f"{BASE}/webhooks/zeffy?secret={WEBHOOK_SECRET}", json=payload)
    assert r.status_code == 400
