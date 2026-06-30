import pytest
from sqlalchemy import select

from app.core.email import get_email_sender
from app.main import app
from app.models.church import Church
from app.models.member import MemberStatus
from app.models.rbac import Role, UserRole
from app.models.user import User


# ── fake e-mail ───────────────────────────────────────────────────────────────

class FakeSender:
    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    def send(self, to, subject, body):
        self.sent.append((to, subject))


@pytest.fixture
def fake_email():
    fake = FakeSender()
    app.dependency_overrides[get_email_sender] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_email_sender, None)


# ── helpers ───────────────────────────────────────────────────────────────────

def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _affiliate(client, header, name, district="Est") -> int:
    return client.post(
        "/churches", json={"name": name, "district": district}, headers=header
    ).json()["id"]


def _request(client, church_id, email="a@b.com", first="Alice", last="Test"):
    return client.post(
        "/members/request",
        json={"church_id": church_id, "first_name": first, "last_name": last, "email": email},
    )


# ── POST /members/request ─────────────────────────────────────────────────────

def test_request_creates_pending_and_emails(client, fake_email, db_session):
    r = _request(client, _mother_id(db_session), "marie@b.com", "Marie", "Koffi")
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    assert fake_email.sent and fake_email.sent[0][0] == "marie@b.com"


def test_request_unknown_church(client, fake_email):
    r = client.post(
        "/members/request",
        json={"church_id": 999999, "first_name": "X", "last_name": "Y", "email": "x@b.com"},
    )
    assert r.status_code == 404


def test_request_invalid_email(client, db_session):
    r = client.post(
        "/members/request",
        json={"church_id": _mother_id(db_session), "first_name": "X", "last_name": "Y",
              "email": "not-an-email"},
    )
    assert r.status_code == 422


# ── GET /members ──────────────────────────────────────────────────────────────

def test_list_requires_auth(client):
    assert client.get("/members").status_code == 401


def test_plain_member_cannot_list(client, make_user, auth_header):
    make_user("plain@b.com", roles=["membre"])
    assert client.get("/members", headers=auth_header("plain@b.com")).status_code == 403


def test_admin_can_list_members(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    _request(client, _mother_id(db_session))
    r = client.get("/members", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_list_with_status_filter(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    _request(client, _mother_id(db_session), email="f@b.com")
    h = auth_header("admin@b.com")
    r_pending = client.get("/members?status=pending", headers=h)
    assert r_pending.status_code == 200
    assert all(m["status"] == "pending" for m in r_pending.json()["items"])


def test_affiliate_admin_sees_only_own(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Ouest")
    b = _affiliate(client, h, "B", "Est")
    _request(client, a, "al@b.com", "Al", "A")
    _request(client, b, "bo@b.com", "Bo", "B")
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    items = client.get("/members", headers=auth_header("chef@b.com")).json()["items"]
    assert {m["church_id"] for m in items} == {a}


# ── GET /members/{id} ─────────────────────────────────────────────────────────

def test_get_member_by_admin(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    member_id = _request(client, _mother_id(db_session), "g@b.com").json()["id"]
    r = client.get(f"/members/{member_id}", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    assert r.json()["id"] == member_id


def test_get_member_not_found(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.get("/members/999999", headers=auth_header("admin@b.com"))
    assert r.status_code == 404


def test_get_member_outside_scope(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Nord")
    b = _affiliate(client, h, "B", "Sud")
    member_id = _request(client, b, "z@b.com", "Z", "Z").json()["id"]
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    r = client.get(f"/members/{member_id}", headers=auth_header("chef@b.com"))
    assert r.status_code == 403


# ── PATCH /members/{id} ───────────────────────────────────────────────────────

def test_update_member(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member_id = _request(client, _mother_id(db_session), "upd@b.com").json()["id"]
    r = client.patch(
        f"/members/{member_id}",
        json={"first_name": "Nouveau", "address": "12 rue des Lilas"},
        headers=h,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["first_name"] == "Nouveau"
    assert body["address"] == "12 rue des Lilas"


# ── POST /members/{id}/approve ────────────────────────────────────────────────

def test_approve_creates_user_and_sends_invite(client, fake_email, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member_id = _request(client, _mother_id(db_session), "new@b.com", "Novo", "User").json()["id"]
    r = client.post(f"/members/{member_id}/approve", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "active"
    assert db_session.scalar(select(User).where(User.email == "new@b.com")) is not None
    assert fake_email.sent


def test_approve_existing_user_sends_approval(client, fake_email, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    make_user("existing@b.com")  # utilisateur déjà existant
    h = auth_header("admin@b.com")
    member_id = _request(client, _mother_id(db_session), "existing@b.com", "Ex", "Isting").json()["id"]
    r = client.post(f"/members/{member_id}/approve", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "active"
    assert fake_email.sent


def test_cannot_approve_outside_scope(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Ouest")
    b = _affiliate(client, h, "B", "Est")
    mid = _request(client, b, "bo@b.com", "Bo", "B").json()["id"]
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    r = client.post(f"/members/{mid}/approve", headers=auth_header("chef@b.com"))
    assert r.status_code == 403


# ── POST /members/{id}/reject ─────────────────────────────────────────────────

def test_reject_member(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "rej@b.com").json()["id"]
    r = client.post(f"/members/{mid}/reject", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


# ── POST /members/{id}/deactivate ─────────────────────────────────────────────

def test_deactivate_member(client, make_user, auth_header, db_session, fake_email):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "deact@b.com").json()["id"]
    client.post(f"/members/{mid}/approve", headers=h)
    r = client.post(f"/members/{mid}/deactivate", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "inactive"


# ── GET /members/me ───────────────────────────────────────────────────────────

def test_me_no_member_profile(client, make_user, auth_header):
    make_user("nomember@b.com")
    r = client.get("/members/me", headers=auth_header("nomember@b.com"))
    assert r.status_code == 404


def test_me_returns_member_profile(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("memme@b.com", church_id)
    r = client.get("/members/me", headers=auth_header("memme@b.com"))
    assert r.status_code == 200
    assert r.json()["email"] == "memme@b.com"
