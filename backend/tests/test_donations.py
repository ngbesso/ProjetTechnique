"""
Tests d'intégration — Module Dons
Style  : pytest-asyncio + httpx.AsyncClient (ASGITransport, sans serveur réel)
Base   : PostgreSQL obnl_test (séparée de la prod)
Chaque test est indépendant : la table donations est vidée avant chaque cas.

Stratégie d'authentification
─────────────────────────────
Les dépendances `get_current_member*` et `get_current_admin` sont remplacées
par des fonctions « intelligentes » qui décodent le vrai JWT (même clé secrète)
et retournent un objet membre fictif, sans toucher à la BD.
Les fixtures `membre_token` / `admin_token` fournissent les en-têtes HTTP prêts
à l'emploi.
"""

import pytest
import pytest_asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from httpx import ASGITransport, AsyncClient
from jose import JWTError, jwt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_current_admin, get_current_member, get_current_member_optional
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Toutes les fonctions async de ce module sont des tests asyncio
pytestmark = pytest.mark.asyncio

# ── Base de test PostgreSQL séparée ───────────────────────────────────────────

_TEST_DB_URL = "postgresql+psycopg://obnl:obnl@postgres:5432/obnl_test"
_engine = create_engine(_TEST_DB_URL, pool_pre_ping=True)
_SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)

# ── Membres fictifs (injectés via override, absent de la BD) ──────────────────

class _FakeMembre:
    """Représente un membre ordinaire authentifié."""
    id = 10
    full_name = "Jean Kofi"
    email = "jean@exemple.com"
    is_admin = False


class _FakeAdmin:
    """Représente un administrateur authentifié."""
    id = 11
    full_name = "Admin Principal"
    email = "admin@exemple.com"
    is_admin = True


# ── Génération de vrais JWT (clé secrète de settings) ────────────────────────

def _forge_token(member_id: int) -> str:
    """Encode un JWT signé avec la même clé que la production."""
    return jwt.encode(
        {"sub": str(member_id)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


# ── Overrides d'authentification ──────────────────────────────────────────────

_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def _decode_fake_member(token: str | None) -> _FakeMembre | _FakeAdmin | None:
    """Décode le JWT et retourne l'objet fictif correspondant (sans BD)."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        mid = int(payload.get("sub", 0))
        return _FakeAdmin() if mid == _FakeAdmin.id else _FakeMembre()
    except JWTError:
        return None


def _override_member_optional(token: str | None = Depends(_oauth2)):
    """Remplace get_current_member_optional — retourne None si pas de token."""
    return _decode_fake_member(token)


def _override_member(token: str | None = Depends(_oauth2)):
    """Remplace get_current_member — lève 401 si token absent ou invalide."""
    member = _decode_fake_member(token)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return member


def _override_admin(current_member=Depends(_override_member)):
    """Remplace get_current_admin — lève 403 si le membre n'est pas admin."""
    if not getattr(current_member, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_member


def _override_get_db():
    """Redirige les accès BD vers obnl_test."""
    db: Session = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Cycle de vie de la base de test ──────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def creer_tables():
    """
    Crée les tables dans obnl_test au début de la session.
    Une table `members` minimale est ajoutée manuellement pour satisfaire
    la contrainte FK donations.member_id → members.id.
    """
    with _engine.connect() as conn:
        # Table membres stub (le vrai modèle est livré séparément)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS members (
                id      SERIAL PRIMARY KEY,
                email   VARCHAR(254) UNIQUE NOT NULL,
                is_admin BOOLEAN NOT NULL DEFAULT FALSE
            )
        """))
        # Insère les deux membres fictifs utilisés dans les tests
        conn.execute(text("""
            INSERT INTO members (id, email, is_admin)
            VALUES (:id1, :e1, FALSE), (:id2, :e2, TRUE)
            ON CONFLICT DO NOTHING
        """), {"id1": _FakeMembre.id, "e1": _FakeMembre.email,
               "id2": _FakeAdmin.id,  "e2": _FakeAdmin.email})
        conn.commit()

    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)
    with _engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS members CASCADE"))
        conn.commit()


@pytest.fixture(autouse=True)
def vider_donations():
    """Vide la table donations avant chaque test pour garantir l'isolation."""
    with _engine.connect() as conn:
        conn.execute(text("DELETE FROM donations"))
        conn.commit()
    yield


# ── Fixtures clients ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """
    Client HTTP asynchrone branché sur l'app FastAPI.
    Les overrides d'auth décodent le JWT passé en header sans toucher à la BD.
    """
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_member_optional] = _override_member_optional
    app.dependency_overrides[get_current_member] = _override_member
    app.dependency_overrides[get_current_admin] = _override_admin

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def membre_token() -> dict[str, str]:
    """En-tête Authorization prêt à l'emploi pour un membre ordinaire."""
    return {"Authorization": f"Bearer {_forge_token(_FakeMembre.id)}"}


@pytest.fixture
def admin_token() -> dict[str, str]:
    """En-tête Authorization prêt à l'emploi pour un administrateur."""
    return {"Authorization": f"Bearer {_forge_token(_FakeAdmin.id)}"}


# ── Payload de référence ──────────────────────────────────────────────────────

_DON_BASE = {
    "amount": 50.0,
    "currency": "CAD",
    "category": "soutien_spirituel",
    "donor_name": "Marie Dupont",
    "donor_email": "marie@exemple.com",
}

# ═════════════════════════════════════════════════════════════════════════════
# Tests — POST /api/donations/
# ═════════════════════════════════════════════════════════════════════════════

async def test_create_donation_success(client, membre_token):
    """Un membre authentifié peut créer un don ; le reçu est généré."""
    resp = await client.post("/api/donations/", json=_DON_BASE, headers=membre_token)

    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == 50.0
    assert data["currency"] == "CAD"
    assert data["category"] == "soutien_spirituel"
    assert data["receipt_number"].startswith("REC-")
    assert data["member_id"] == _FakeMembre.id


async def test_create_donation_anonymous(client):
    """Un visiteur anonyme peut donner en fournissant son nom et courriel."""
    resp = await client.post("/api/donations/", json=_DON_BASE)

    assert resp.status_code == 201
    data = resp.json()
    assert data["member_id"] is None
    assert data["donor_name"] == "Marie Dupont"
    assert data["donor_email"] == "marie@exemple.com"
    assert data["receipt_number"].startswith("REC-")


async def test_create_donation_montant_negatif(client):
    """Un montant négatif ou nul est rejeté avec HTTP 422."""
    resp = await client.post(
        "/api/donations/", json={**_DON_BASE, "amount": -10}
    )
    assert resp.status_code == 422


# ═════════════════════════════════════════════════════════════════════════════
# Tests — GET /api/donations/  (admin uniquement)
# ═════════════════════════════════════════════════════════════════════════════

async def test_list_donations_admin(client, admin_token):
    """Un admin obtient la liste complète des dons (HTTP 200)."""
    # Prépare deux dons dans la base de test
    await client.post("/api/donations/", json=_DON_BASE)
    await client.post("/api/donations/", json={**_DON_BASE, "amount": 25.0})

    resp = await client.get("/api/donations/", headers=admin_token)

    assert resp.status_code == 200
    dons = resp.json()
    assert len(dons) == 2
    # Vérifie l'ordre décroissant par date
    assert dons[0]["amount"] == 25.0


async def test_list_donations_non_admin(client, membre_token):
    """Un membre ordinaire ne peut pas accéder à la liste globale (HTTP 403)."""
    resp = await client.get("/api/donations/", headers=membre_token)
    assert resp.status_code == 403


# ═════════════════════════════════════════════════════════════════════════════
# Tests — GET /api/donations/me
# ═════════════════════════════════════════════════════════════════════════════

async def test_mes_dons_avec_jwt(client, membre_token):
    """Un membre authentifié obtient uniquement ses propres dons (HTTP 200)."""
    # Don du membre courant
    await client.post("/api/donations/", json=_DON_BASE, headers=membre_token)
    # Don anonyme (ne doit pas apparaître dans /me)
    await client.post("/api/donations/", json=_DON_BASE)

    resp = await client.get("/api/donations/me", headers=membre_token)

    assert resp.status_code == 200
    dons = resp.json()
    assert len(dons) == 1
    assert dons[0]["member_id"] == _FakeMembre.id


async def test_mes_dons_sans_jwt(client):
    """Sans JWT, l'endpoint /me renvoie HTTP 401."""
    resp = await client.get("/api/donations/me")
    assert resp.status_code == 401


# ═════════════════════════════════════════════════════════════════════════════
# Tests — GET /api/donations/{id}
# ═════════════════════════════════════════════════════════════════════════════

async def test_get_donation_par_id(client, membre_token):
    """Un membre peut consulter le détail d'un de ses propres dons (HTTP 200)."""
    created = (
        await client.post("/api/donations/", json=_DON_BASE, headers=membre_token)
    ).json()

    resp = await client.get(
        f"/api/donations/{created['id']}", headers=membre_token
    )

    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]
    assert resp.json()["receipt_number"] == created["receipt_number"]


async def test_get_donation_inexistant(client, membre_token):
    """La consultation d'un don inexistant retourne HTTP 404."""
    resp = await client.get("/api/donations/99999", headers=membre_token)
    assert resp.status_code == 404


# ═════════════════════════════════════════════════════════════════════════════
# Tests — GET /api/donations/{id}/recu
# ═════════════════════════════════════════════════════════════════════════════

async def test_get_recu(client, membre_token):
    """Le reçu fiscal contient les champs obligatoires (HTTP 200)."""
    created = (
        await client.post("/api/donations/", json=_DON_BASE, headers=membre_token)
    ).json()

    resp = await client.get(
        f"/api/donations/{created['id']}/recu", headers=membre_token
    )

    assert resp.status_code == 200
    recu = resp.json()

    # Champs obligatoires du reçu
    assert recu["receipt_number"] == created["receipt_number"]
    assert recu["amount"] == 50.0
    assert recu["currency"] == "CAD"
    assert recu["category"] == "soutien_spirituel"
    assert "donor_name" in recu
    assert "created_at" in recu
