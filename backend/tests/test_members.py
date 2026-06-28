import pytest
from sqlalchemy import select

from app.core.email import get_email_sender
from app.main import app
from app.models.church import Church
from app.models.rbac import Role, UserRole


class FakeSender:
    def __init__(self): self.sent = []
    def send(self, to, subject, body): self.sent.append((to, subject))


@pytest.fixture
def fake_email():
    fake = FakeSender()
    app.dependency_overrides[get_email_sender] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_email_sender, None)


def mother_id(db):
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def affiliate(client, header, name, district):
    return client.post("/churches", json={"name": name, "district": district},
                       headers=header).json()["id"]


def test_request_creates_pending_and_emails(client, fake_email, db_session):
    r = client.post("/members/request", json={
        "church_id": mother_id(db_session),
        "first_name": "Marie", "last_name": "Koffi", "email": "marie@b.com"})
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert fake_email.sent and fake_email.sent[0][0] == "marie@b.com"


def test_plain_member_cannot_list(client, make_user, auth_header):
    make_user("plain@b.com", roles=["membre"])      # membre n'a pas member:read
    assert client.get("/members", headers=auth_header("plain@b.com")).status_code == 403


def test_affiliate_admin_sees_only_own(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"]); h = auth_header("boss@b.com")
    a = affiliate(client, h, "A", "Ouest")
    b = affiliate(client, h, "B", "Est")
    client.post("/members/request", json={"church_id": a, "first_name": "Al", "last_name": "A", "email": "al@b.com"})
    client.post("/members/request", json={"church_id": b, "first_name": "Bo", "last_name": "B", "email": "bo@b.com"})
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a)); db_session.flush()
    items = client.get("/members", headers=auth_header("chef@b.com")).json()["items"]
    assert {m["church_id"] for m in items} == {a}


def test_cannot_approve_outside_scope(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"]); h = auth_header("boss@b.com")
    a = affiliate(client, h, "A", "Ouest")
    b = affiliate(client, h, "B", "Est")
    mid = client.post("/members/request", json={
        "church_id": b, "first_name": "Bo", "last_name": "B", "email": "bo@b.com"}).json()["id"]
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a)); db_session.flush()
    r = client.post(f"/members/{mid}/approve", headers=auth_header("chef@b.com"))
    assert r.status_code == 403