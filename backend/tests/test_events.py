from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.church import Church
from app.models.event import Event, EventRegistration

BASE = "/api/events"


# ── Helpers ────────────────────────────────────────────────────────────────────


def _event(
    db_session,
    title="Conférence Test",
    is_published=True,
    days_from_now=7,
    max_participants=None,
):
    e = Event(
        title=title,
        date_start=datetime.now(timezone.utc) + timedelta(days=days_from_now),
        location="Salle communautaire",
        is_published=is_published,
        max_participants=max_participants,
    )
    db_session.add(e)
    db_session.flush()
    return e


def _admin_header(make_user, auth_header):
    make_user("admin_event@test.com", roles=["admin"])
    return auth_header("admin_event@test.com")


# ── Liste et détail publics ─────────────────────────────────────────────────────


def test_list_public_only_published_and_upcoming(client, db_session):
    _event(db_session, "Publié à venir", is_published=True, days_from_now=5)
    _event(db_session, "Brouillon", is_published=False, days_from_now=5)
    _event(db_session, "Publié passé", is_published=True, days_from_now=-5)

    r = client.get(f"{BASE}/")
    assert r.status_code == 200
    titles = [e["title"] for e in r.json()["items"]]
    assert "Publié à venir" in titles
    assert "Brouillon" not in titles
    assert "Publié passé" not in titles


def test_list_filters_by_district(client, db_session):
    e1 = _event(db_session, "Événement Ouest")
    e1.district = "Ouest"
    e2 = _event(db_session, "Événement Est")
    e2.district = "Est"
    db_session.flush()

    r = client.get(f"{BASE}/?district=Ouest")
    assert r.status_code == 200
    titles = [e["title"] for e in r.json()["items"]]
    assert "Événement Ouest" in titles
    assert "Événement Est" not in titles


def test_get_event_detail(client, db_session):
    e = _event(db_session, "Détail public")
    r = client.get(f"{BASE}/{e.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Détail public"
    assert body["registered_count"] == 0
    assert body["spots_left"] is None


def test_get_event_unpublished_not_found(client, db_session):
    e = _event(db_session, "Caché", is_published=False)
    r = client.get(f"{BASE}/{e.id}")
    assert r.status_code == 404


def test_get_event_not_found(client, db_session):
    r = client.get(f"{BASE}/999999")
    assert r.status_code == 404


# ── Liste admin ────────────────────────────────────────────────────────────────


def test_admin_list_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("membre_admin_list@test.com", church_id)
    r = client.get(f"{BASE}/admin", headers=auth_header("membre_admin_list@test.com"))
    assert r.status_code == 403


def test_admin_list_includes_drafts_and_past(client, make_user, auth_header, db_session):
    _event(db_session, "Brouillon admin", is_published=False)
    _event(db_session, "Passé admin", is_published=True, days_from_now=-10)
    h = _admin_header(make_user, auth_header)

    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    titles = [e["title"] for e in r.json()["items"]]
    assert "Brouillon admin" in titles
    assert "Passé admin" in titles


# ── Création / modification / suppression (admin) ───────────────────────────────


def _payload(church_id=None):
    return {
        "title": "Nouvel événement",
        "date_start": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "location": "Église mère",
        "church_id": church_id,
        "is_published": True,
    }


def test_create_event_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("membre_event@test.com", church_id)
    r = client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("membre_event@test.com")
    )
    assert r.status_code == 403


def test_create_event_as_admin(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    r = client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    assert r.status_code == 201
    assert r.json()["title"] == "Nouvel événement"


def test_update_event_admin_only(client, make_user, auth_header, db_session):
    e = _event(db_session, "À modifier")
    h = _admin_header(make_user, auth_header)
    r = client.put(f"{BASE}/{e.id}", json={"title": "Titre modifié"}, headers=h)
    assert r.status_code == 200
    assert r.json()["title"] == "Titre modifié"


def test_delete_event_admin_only(client, make_user, auth_header, db_session):
    e = _event(db_session, "À supprimer")
    h = _admin_header(make_user, auth_header)
    r = client.delete(f"{BASE}/{e.id}", headers=h)
    assert r.status_code == 204
    assert db_session.get(Event, e.id) is None


# ── Inscription / annulation ────────────────────────────────────────────────────


def test_register_requires_auth(client, db_session):
    e = _event(db_session, "Inscription")
    r = client.post(f"{BASE}/{e.id}/register")
    assert r.status_code == 401


def test_register_success(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc1@test.com", church_id)
    e = _event(db_session, "Inscription simple")

    r = client.post(f"{BASE}/{e.id}/register", headers=auth_header("insc1@test.com"))
    assert r.status_code == 201
    assert r.json()["status"] == "confirmed"

    detail = client.get(f"{BASE}/{e.id}").json()
    assert detail["registered_count"] == 1


def test_register_is_idempotent(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc2@test.com", church_id)
    e = _event(db_session, "Inscription double")
    h = auth_header("insc2@test.com")

    client.post(f"{BASE}/{e.id}/register", headers=h)
    r2 = client.post(f"{BASE}/{e.id}/register", headers=h)
    assert r2.status_code == 201

    count = (
        db_session.query(EventRegistration)
        .filter(EventRegistration.event_id == e.id)
        .count()
    )
    assert count == 1


def test_register_full_event_conflict(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc3@test.com", church_id)
    make_member("insc4@test.com", church_id)
    e = _event(db_session, "Complet", max_participants=1)

    r1 = client.post(f"{BASE}/{e.id}/register", headers=auth_header("insc3@test.com"))
    assert r1.status_code == 201
    r2 = client.post(f"{BASE}/{e.id}/register", headers=auth_header("insc4@test.com"))
    assert r2.status_code == 409


def test_cancel_then_register_again(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc5@test.com", church_id)
    e = _event(db_session, "Annulation")
    h = auth_header("insc5@test.com")

    client.post(f"{BASE}/{e.id}/register", headers=h)
    r_cancel = client.delete(f"{BASE}/{e.id}/register", headers=h)
    assert r_cancel.status_code == 204

    detail = client.get(f"{BASE}/{e.id}").json()
    assert detail["registered_count"] == 0

    r_again = client.post(f"{BASE}/{e.id}/register", headers=h)
    assert r_again.status_code == 201
    assert r_again.json()["status"] == "confirmed"


def test_cancel_without_registration_not_found(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc6@test.com", church_id)
    e = _event(db_session, "Sans inscription")
    r = client.delete(f"{BASE}/{e.id}/register", headers=auth_header("insc6@test.com"))
    assert r.status_code == 404


def test_participants_admin_only(client, make_user, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc7@test.com", church_id)
    e = _event(db_session, "Avec participants")
    client.post(f"{BASE}/{e.id}/register", headers=auth_header("insc7@test.com"))

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/{e.id}/participants", headers=h)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["member_email"] == "insc7@test.com"


def test_participants_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc8@test.com", church_id)
    e = _event(db_session, "Protégé")
    r = client.get(f"{BASE}/{e.id}/participants", headers=auth_header("insc8@test.com"))
    assert r.status_code == 403
