from sqlalchemy import select

from app.core.config import settings
from app.models.church import Church

BASE = "/prayer-requests"


def _admin_header(make_user, auth_header):
    make_user("admin_prayer@test.com", roles=["admin"])
    return auth_header("admin_prayer@test.com")


# ── POST /prayer-requests ────────────────────────────────────────────────────


def test_create_requires_auth(client):
    r = client.post(BASE, json={"message": "Priez pour ma famille"})
    assert r.status_code == 401


def test_create_success_sends_email_to_admin(
    client, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("pray1@test.com", church_id)
    r = client.post(
        BASE, json={"message": "Priez pour ma santé"}, headers=auth_header("pray1@test.com")
    )
    assert r.status_code == 201
    body = r.json()
    assert body["message"] == "Priez pour ma santé"
    assert body["status"] == "new"
    assert fake_email.sent
    assert fake_email.sent[0][0] == settings.admin_email


def test_create_rejects_empty_message(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("pray2@test.com", church_id)
    r = client.post(BASE, json={"message": ""}, headers=auth_header("pray2@test.com"))
    assert r.status_code == 422


# ── GET /prayer-requests/me ──────────────────────────────────────────────────


def test_list_me_requires_auth(client):
    assert client.get(f"{BASE}/me").status_code == 401


def test_list_me_isolated_between_members(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayA@test.com", church_id)
    make_member("prayB@test.com", church_id)
    client.post(BASE, json={"message": "Une prière"}, headers=auth_header("prayA@test.com"))

    r_a = client.get(f"{BASE}/me", headers=auth_header("prayA@test.com"))
    r_b = client.get(f"{BASE}/me", headers=auth_header("prayB@test.com"))
    assert len(r_a.json()) == 1
    assert len(r_b.json()) == 0


# ── GET /prayer-requests/admin ───────────────────────────────────────────────


def test_admin_list_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayplain@test.com", church_id)
    r = client.get(f"{BASE}/admin", headers=auth_header("prayplain@test.com"))
    assert r.status_code == 403


def test_admin_list_includes_member_info(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayc@test.com", church_id)
    client.post(
        BASE, json={"message": "Merci de prier pour moi"}, headers=auth_header("prayc@test.com")
    )

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["member_email"] == "prayc@test.com"
    assert body[0]["status"] == "new"


def test_admin_list_filter_by_status(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayd@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "A"}, headers=auth_header("prayd@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)

    r_new = client.get(f"{BASE}/admin?status=new", headers=h)
    r_handled = client.get(f"{BASE}/admin?status=handled", headers=h)
    assert len(r_new.json()) == 0
    assert len(r_handled.json()) == 1


# ── PATCH /prayer-requests/{id} ──────────────────────────────────────────────


def test_update_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("praye@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "B"}, headers=auth_header("praye@test.com")
    ).json()["id"]
    r = client.patch(
        f"{BASE}/{req_id}", json={"status": "handled"}, headers=auth_header("praye@test.com")
    )
    assert r.status_code == 403


def test_update_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/999999", json={"status": "handled"}, headers=h)
    assert r.status_code == 404


def test_update_to_handled_sends_email_to_member(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayf@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "C"}, headers=auth_header("prayf@test.com")
    ).json()["id"]
    fake_email.sent.clear()

    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)
    assert r.status_code == 200
    assert fake_email.sent
    assert fake_email.sent[-1][0] == "prayf@test.com"


def test_update_to_new_does_not_send_handled_email(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayg@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "D"}, headers=auth_header("prayg@test.com")
    ).json()["id"]
    h = _admin_header(make_user, auth_header)
    client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)
    fake_email.sent.clear()

    r = client.patch(f"{BASE}/{req_id}", json={"status": "new"}, headers=h)
    assert r.status_code == 200
    assert not fake_email.sent
