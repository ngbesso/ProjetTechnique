import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.church import Church
from app.models.member import Member  # noqa: F401 (enregistre la table)
from app.models.rbac import Role, UserRole
from app.models.user import User
from app.seed import ensure_mother_church, seed_roles_permissions

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
                db_session.add(UserRole(user_id=user.id, role_id=role.id, church_id=mother.id))
        db_session.flush()
        return user
    return _make


@pytest.fixture
def auth_header(client):
    def _header(email, password="secret123"):
        r = client.post("/auth/login", data={"username": email, "password": password})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _header