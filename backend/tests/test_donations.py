"""Tests du module donations.

Stratégie : base SQLite en mémoire + override des dépendances FastAPI
pour s'affranchir de PostgreSQL et de l'authentification JWT en CI.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.donation import Donation, DonationCategory, DonationCurrency

# ── Base de données SQLite en mémoire ─────────────────────────────────────────

SQLITE_URL = "sqlite:///:memory:"
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Membres fictifs ────────────────────────────────────────────────────────────

class FakeMember:
    id = 1
    full_name = "Jean Kofi"
    email = "jean@exemple.com"
    is_admin = False


class FakeAdmin:
    id = 2
    full_name = "Admin"
    email = "admin@exemple.com"
    is_admin = True


# ── Fixtures client ────────────────────────────────────────────────────────────

@pytest.fixture
def client_anonymous():
    """Client sans authentification."""
    from app.api.deps import get_current_member_optional

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_member_optional] = lambda: None
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_member():
    """Client authentifié en tant que membre."""
    from app.api.deps import (
        get_current_member,
        get_current_member_optional,
    )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_member_optional] = lambda: FakeMember()
    app.dependency_overrides[get_current_member] = lambda: FakeMember()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_admin():
    """Client authentifié en tant qu'administrateur."""
    from app.api.deps import (
        get_current_admin,
        get_current_member,
        get_current_member_optional,
    )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_member_optional] = lambda: FakeAdmin()
    app.dependency_overrides[get_current_member] = lambda: FakeAdmin()
    app.dependency_overrides[get_current_admin] = lambda: FakeAdmin()
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── Helpers ────────────────────────────────────────────────────────────────────

VALID_PAYLOAD = {
    "amount": 50.0,
    "currency": "CAD",
    "category": "soutien_spirituel",
    "donor_name": "Marie Dupont",
    "donor_email": "marie@exemple.com",
}


# ── Tests POST /api/donations/ ─────────────────────────────────────────────────

def test_create_donation_anonymous(client_anonymous):
    resp = client_anonymous.post("/api/donations/", json=VALID_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == 50.0
    assert data["currency"] == "CAD"
    assert data["category"] == "soutien_spirituel"
    assert data["receipt_number"].startswith("REC-")
    assert data["member_id"] is None


def test_create_donation_member(client_member):
    payload = {**VALID_PAYLOAD}
    resp = client_member.post("/api/donations/", json=payload)
    assert resp.status_code == 201
    assert resp.json()["member_id"] == FakeMember.id


def test_create_donation_anonymous_missing_name(client_anonymous):
    """Un don anonyme sans nom doit échouer."""
    payload = {**VALID_PAYLOAD, "donor_name": None, "donor_email": None}
    resp = client_anonymous.post("/api/donations/", json=payload)
    assert resp.status_code == 422


def test_create_donation_negative_amount(client_anonymous):
    resp = client_anonymous.post("/api/donations/", json={**VALID_PAYLOAD, "amount": -10})
    assert resp.status_code == 422


def test_create_donation_zero_amount(client_anonymous):
    resp = client_anonymous.post("/api/donations/", json={**VALID_PAYLOAD, "amount": 0})
    assert resp.status_code == 422


def test_create_donation_invalid_category(client_anonymous):
    resp = client_anonymous.post("/api/donations/", json={**VALID_PAYLOAD, "category": "inconnu"})
    assert resp.status_code == 422


# ── Tests GET /api/donations/me ───────────────────────────────────────────────

def test_list_my_donations_empty(client_member):
    resp = client_member.get("/api/donations/me")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_my_donations(client_member):
    client_member.post("/api/donations/", json=VALID_PAYLOAD)
    client_member.post("/api/donations/", json={**VALID_PAYLOAD, "amount": 25.0})
    resp = client_member.get("/api/donations/me")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_my_donations_unauthenticated(client_anonymous):
    """Sans JWT, /me doit refuser."""
    from app.api.deps import get_current_member

    app.dependency_overrides[get_current_member] = lambda: (_ for _ in ()).throw(
        __import__("fastapi").HTTPException(status_code=401)
    )
    resp = client_anonymous.get("/api/donations/me")
    assert resp.status_code == 401


# ── Tests GET /api/donations/ (admin) ─────────────────────────────────────────

def test_list_all_as_admin(client_admin, client_anonymous):
    client_anonymous.post("/api/donations/", json=VALID_PAYLOAD)
    resp = client_admin.get("/api/donations/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_list_all_forbidden_for_member(client_member):
    resp = client_member.get("/api/donations/")
    assert resp.status_code == 403


# ── Tests GET /api/donations/{id} ─────────────────────────────────────────────

def test_get_donation_by_member(client_member):
    created = client_member.post("/api/donations/", json=VALID_PAYLOAD).json()
    resp = client_member.get(f"/api/donations/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_get_donation_not_found(client_member):
    resp = client_member.get("/api/donations/9999")
    assert resp.status_code == 404


# ── Tests GET /api/donations/{id}/recu ────────────────────────────────────────

def test_get_receipt(client_member):
    created = client_member.post("/api/donations/", json=VALID_PAYLOAD).json()
    resp = client_member.get(f"/api/donations/{created['id']}/recu")
    assert resp.status_code == 200
    receipt = resp.json()
    assert receipt["receipt_number"] == created["receipt_number"]
    assert receipt["amount"] == 50.0
    assert "donor_name" in receipt


def test_receipt_number_unique(client_anonymous):
    """Deux dons ne peuvent pas avoir le même numéro de reçu."""
    r1 = client_anonymous.post("/api/donations/", json=VALID_PAYLOAD).json()
    r2 = client_anonymous.post("/api/donations/", json=VALID_PAYLOAD).json()
    assert r1["receipt_number"] != r2["receipt_number"]


# ── Tests unitaires du service ────────────────────────────────────────────────

def test_service_create_and_list():
    from app.schemas.donation import DonationCreate
    from app.services import donation_service

    db: Session = TestingSessionLocal()
    payload = DonationCreate(
        amount=100.0,
        currency=DonationCurrency.USD,
        category=DonationCategory.DEVELOPPEMENT,
        donor_name="Test",
        donor_email="test@test.com",
    )
    don = donation_service.create_donation(db, payload, donor_name="Test", donor_email="test@test.com")
    assert don.id is not None
    assert don.receipt_number.startswith("REC-")

    all_dons = donation_service.list_all(db)
    assert len(all_dons) == 1

    fetched = donation_service.get_donation(db, don.id)
    assert fetched is not None
    assert fetched.amount == 100.0

    db.close()
