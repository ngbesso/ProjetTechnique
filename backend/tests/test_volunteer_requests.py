from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.models.church import Church
from app.models.event import Event, EventStatus

BASE = "/volunteer-requests"


def _event(db_session, title="Événement Test", status=EventStatus.published):
    e = Event(
        title=title,
        date_start=datetime.now(timezone.utc) + timedelta(days=5),
        status=status,
    )
    db_session.add(e)
    db_session.flush()
    return e


def _admin_header(make_user, auth_header):
    make_user("admin_vol@test.com", roles=["admin"])
    return auth_header("admin_vol@test.com")


# ── POST /volunteer-requests ─────────────────────────────────────────────────


def test_create_requires_auth(client, db_session):
    e = _event(db_session)
    r = client.post(BASE, json={"event_id": e.id, "message": "Je veux aider"})
    assert r.status_code == 401


def test_create_success_sends_email_to_admin(
    client, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("vol1@test.com", church_id)
    e = _event(db_session, "Camp d'été")
    r = client.post(
        BASE,
        json={"event_id": e.id, "message": "Disponible le samedi"},
        headers=auth_header("vol1@test.com"),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["event_id"] == e.id
    assert body["status"] == "pending"
    assert fake_email.sent
    assert fake_email.sent[0][0] == settings.admin_email


def test_create_unknown_event_404(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("vol2@test.com", church_id)
    r = client.post(BASE, json={"event_id": 999999}, headers=auth_header("vol2@test.com"))
    assert r.status_code == 404


# ── GET /volunteer-requests/me ───────────────────────────────────────────────


def test_list_me_requires_auth(client):
    assert client.get(f"{BASE}/me").status_code == 401


def test_list_me_isolated_between_members(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("volA@test.com", church_id)
    make_member("volB@test.com", church_id)
    e = _event(db_session)
    client.post(BASE, json={"event_id": e.id}, headers=auth_header("volA@test.com"))

    r_a = client.get(f"{BASE}/me", headers=auth_header("volA@test.com"))
    r_b = client.get(f"{BASE}/me", headers=auth_header("volB@test.com"))
    assert len(r_a.json()) == 1
    assert len(r_b.json()) == 0


# ── GET /volunteer-requests/admin ────────────────────────────────────────────


def test_admin_list_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("volplain@test.com", church_id)
    r = client.get(f"{BASE}/admin", headers=auth_header("volplain@test.com"))
    assert r.status_code == 403


def test_admin_list_includes_member_and_event_info(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("volc@test.com", church_id)
    e = _event(db_session, "Croisade")
    client.post(
        BASE, json={"event_id": e.id, "message": "Motivé"}, headers=auth_header("volc@test.com")
    )

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["member_email"] == "volc@test.com"
    assert body[0]["event_title"] == "Croisade"


def test_admin_list_filter_by_status_and_event(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("vold@test.com", church_id)
    make_member("vole@test.com", church_id)
    e1 = _event(db_session, "Événement 1")
    e2 = _event(db_session, "Événement 2")
    client.post(BASE, json={"event_id": e1.id}, headers=auth_header("vold@test.com"))
    client.post(BASE, json={"event_id": e2.id}, headers=auth_header("vole@test.com"))

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin?event_id={e1.id}", headers=h)
    assert len(r.json()) == 1
    assert r.json()[0]["event_id"] == e1.id


# ── PATCH /volunteer-requests/{id} ───────────────────────────────────────────


def test_update_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("volf@test.com", church_id)
    e = _event(db_session)
    req_id = client.post(
        BASE, json={"event_id": e.id}, headers=auth_header("volf@test.com")
    ).json()["id"]
    r = client.patch(
        f"{BASE}/{req_id}", json={"status": "approved"}, headers=auth_header("volf@test.com")
    )
    assert r.status_code == 403


def test_update_approve_sends_email_to_member(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("volg@test.com", church_id)
    e = _event(db_session)
    req_id = client.post(
        BASE, json={"event_id": e.id}, headers=auth_header("volg@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    fake_email.sent.clear()
    r = client.patch(f"{BASE}/{req_id}", json={"status": "approved"}, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "approved"
    assert fake_email.sent
    assert fake_email.sent[-1][0] == "volg@test.com"


def test_update_reject_sends_email_to_member(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("volh@test.com", church_id)
    e = _event(db_session)
    req_id = client.post(
        BASE, json={"event_id": e.id}, headers=auth_header("volh@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    fake_email.sent.clear()
    r = client.patch(f"{BASE}/{req_id}", json={"status": "rejected"}, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert fake_email.sent
    assert fake_email.sent[-1][0] == "volh@test.com"


def test_update_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/999999", json={"status": "approved"}, headers=h)
    assert r.status_code == 404
