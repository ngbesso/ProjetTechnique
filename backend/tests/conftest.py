import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import get_email_sender
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.church import Church
from app.models.member import Member, MemberStatus  # noqa: F401
from app.models.parameter import ParameterValue  # noqa: F401
from app.models.rbac import Role, UserRole
from app.models.setting import AppSetting  # noqa: F401
from app.models.user import User
from app.seed import (
    ensure_mother_church,
    seed_parameters,
    seed_roles_permissions,
    seed_settings,
)

TEST_DB_URL = os.getenv("TEST_DATABASE_URL") or (
    settings.database_url.rsplit("/", 1)[0] + "/obnl_test"
)
engine = create_engine(TEST_DB_URL, pool_pre_ping=True)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        seed_roles_permissions(s)
        ensure_mother_church(s)
        seed_parameters(s)
        seed_settings(s)
        s.commit()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_session):
    def _make(email, password="secret123", roles=()):
        user = User(email=email, hashed_password=hash_password(password))
        db_session.add(user)
        db_session.flush()
        mother = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
        for name in roles:
            role = db_session.scalar(select(Role).where(Role.name == name))
            if role:
                db_session.add(
                    UserRole(user_id=user.id, role_id=role.id, church_id=mother.id)
                )
        db_session.flush()
        return user

    return _make


@pytest.fixture
def auth_header(client):
    def _header(email, password="secret123"):
        r = client.post("/auth/login", data={"username": email, "password": password})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _header


@pytest.fixture
def make_member(db_session, make_user):
    """Crée un User + un Member actif lié."""

    def _make(email, church_id, password="secret123"):
        user = make_user(email, password=password)
        member = Member(
            church_id=church_id,
            first_name="Test",
            last_name="Member",
            email=email,
            status=MemberStatus.active,
            user_id=user.id,
        )
        db_session.add(member)
        db_session.flush()
        return member

    return _make


class FakeSender:
    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to, subject, body):
        self.sent.append((to, subject, body))


@pytest.fixture
def fake_email():
    fake = FakeSender()
    app.dependency_overrides[get_email_sender] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_email_sender, None)
