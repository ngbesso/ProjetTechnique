from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from sqlalchemy import select

from app.models.church import Church
from app.models.event import Event, EventCategory, EventRegistration, EventStatus

BASE = "/api/events"


# ── Helpers ────────────────────────────────────────────────────────────────────


def _event(
    db_session,
    title="Conférence Test",
    category=EventCategory.conference,
    status=EventStatus.published,
    days_from_now=7,
    capacity=None,
):
    e = Event(
        title=title,
        category=category,
        date_start=datetime.now(timezone.utc) + timedelta(days=days_from_now),
        location="Salle communautaire",
        status=status,
        capacity=capacity,
    )
    db_session.add(e)
    db_session.flush()
    return e


def _admin_header(make_user, auth_header):
    make_user("admin_event@test.com", roles=["admin"])
    return auth_header("admin_event@test.com")


def _fake_storage():
    fake = MagicMock()
    fake.upload_file.return_value = None
    fake.delete_file.return_value = None
    fake.presigned_url.return_value = "http://fake-storage/events/cover.jpg"
    return fake


# ── Liste et détail publics ─────────────────────────────────────────────────────


def test_list_public_only_published_and_upcoming(client, db_session):
    _event(db_session, "Publié à venir", status=EventStatus.published, days_from_now=5)
    _event(db_session, "Brouillon", status=EventStatus.draft, days_from_now=5)
    _event(db_session, "Publié passé", status=EventStatus.published, days_from_now=-5)

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


def test_list_filters_by_category(client, db_session):
    _event(db_session, "Conférence A", category=EventCategory.conference)
    _event(db_session, "Formation B", category=EventCategory.formation)

    r = client.get(f"{BASE}/?category=formation")
    assert r.status_code == 200
    titles = [e["title"] for e in r.json()["items"]]
    assert "Formation B" in titles
    assert "Conférence A" not in titles


def test_get_event_detail(client, db_session):
    e = _event(db_session, "Détail public")
    r = client.get(f"{BASE}/{e.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Détail public"
    assert body["category"] == "conference"
    assert body["registered_count"] == 0
    assert body["spots_left"] is None


def test_get_event_unpublished_not_found(client, db_session):
    e = _event(db_session, "Caché", status=EventStatus.draft)
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
    _event(db_session, "Brouillon admin", status=EventStatus.draft)
    _event(db_session, "Passé admin", status=EventStatus.published, days_from_now=-10)
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
        "category": "conference",
        "date_start": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "location": "Église mère",
        "church_id": church_id,
        "status": "published",
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


def test_create_formation_category_as_admin(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["category"] = "formation"
    payload["instructor"] = "Formateur X"
    payload["price"] = 25
    payload["capacity"] = 10
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["category"] == "formation"
    assert body["instructor"] == "Formateur X"
    assert body["capacity"] == 10


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


def test_register_guest_without_account_succeeds(client, db_session):
    """Aucun compte n'est requis pour s'inscrire à un événement."""
    e = _event(db_session, "Inscription invité")
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Alice", "last_name": "Martin", "email": "alice@test.com"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "confirmed"
    assert body["member_id"] is None
    assert body["email"] == "alice@test.com"

    detail = client.get(f"{BASE}/{e.id}").json()
    assert detail["registered_count"] == 1


def test_register_guest_missing_fields_rejected(client, db_session):
    e = _event(db_session, "Inscription incomplète")
    r = client.post(f"{BASE}/{e.id}/register", json={})
    assert r.status_code == 422


def test_register_success(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc1@test.com", church_id)
    e = _event(db_session, "Inscription simple")

    r = client.post(f"{BASE}/{e.id}/register", headers=auth_header("insc1@test.com"))
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "confirmed"
    assert body["email"] == "insc1@test.com"
    assert body["member_id"] is not None

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
    e = _event(db_session, "Complet", capacity=1)

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
    assert r.json()[0]["email"] == "insc7@test.com"


def test_participants_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("insc8@test.com", church_id)
    e = _event(db_session, "Protégé")
    r = client.get(f"{BASE}/{e.id}/participants", headers=auth_header("insc8@test.com"))
    assert r.status_code == 403


# ── Mes inscriptions ─────────────────────────────────────────────────────────


def test_my_registrations_requires_auth(client):
    assert client.get(f"{BASE}/registrations/me").status_code == 401


def test_my_registrations_empty_when_none(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("noregs_evt@test.com", church_id)
    r = client.get(f"{BASE}/registrations/me", headers=auth_header("noregs_evt@test.com"))
    assert r.status_code == 200
    assert r.json() == []


def test_my_registrations_matches_guest_registration_by_email(
    client, make_member, auth_header, db_session
):
    """Une inscription faite sans compte (courriel correspondant à un membre,
    p. ex. héritée de l'ancien module Formations) doit apparaître dans
    « Mes inscriptions »."""
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    member = make_member("guestmatch@test.com", church_id)
    e = _event(db_session, "Formation héritée", category=EventCategory.formation)

    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Test", "last_name": "Member", "email": member.email},
    )
    assert r.status_code == 201

    r = client.get(f"{BASE}/registrations/me", headers=auth_header("guestmatch@test.com"))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["event"]["title"] == "Formation héritée"
    assert body[0]["event"]["category"] == "formation"


def test_my_registrations_isolated_between_members(
    client, make_member, auth_header, db_session
):
    """Un membre ne doit jamais voir les inscriptions d'un autre membre."""
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("regA_evt@test.com", church_id)
    make_member("regB_evt@test.com", church_id)
    e = _event(db_session, "Isolation")
    client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "A", "last_name": "Test", "email": "regA_evt@test.com"},
    )

    r_a = client.get(f"{BASE}/registrations/me", headers=auth_header("regA_evt@test.com"))
    r_b = client.get(f"{BASE}/registrations/me", headers=auth_header("regB_evt@test.com"))
    assert len(r_a.json()) == 1
    assert len(r_b.json()) == 0


# ── Image de couverture ──────────────────────────────────────────────────────


def test_upload_event_image_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("img_noperm@test.com", church_id)
    e = _event(db_session, "Sans droit")
    with patch("app.api.routes.events.storage", _fake_storage()):
        r = client.post(
            f"{BASE}/{e.id}/image",
            headers=auth_header("img_noperm@test.com"),
            files={"file": ("cover.jpg", b"fakeimage", "image/jpeg")},
        )
    assert r.status_code == 403


def test_upload_event_image_success(client, make_user, auth_header, db_session):
    e = _event(db_session, "Avec image")
    h = _admin_header(make_user, auth_header)
    fake = _fake_storage()
    with patch("app.api.routes.events.storage", fake):
        r = client.post(
            f"{BASE}/{e.id}/image",
            headers=h,
            files={"file": ("cover.jpg", b"fakeimage", "image/jpeg")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["image_url"] == "http://fake-storage/events/cover.jpg"
    fake.upload_file.assert_called_once()
    args, _kwargs = fake.upload_file.call_args
    assert args[1] == f"events/{e.id}/cover.jpg"


def test_upload_event_image_extension_from_content_type(client, make_user, auth_header, db_session):
    """Sans extension dans le nom de fichier, dérive l'extension du content-type."""
    e = _event(db_session, "Sans extension")
    h = _admin_header(make_user, auth_header)
    fake = _fake_storage()
    with patch("app.api.routes.events.storage", fake):
        r = client.post(
            f"{BASE}/{e.id}/image",
            headers=h,
            files={"file": ("coverfile", b"fakeimage", "image/png")},
        )
    assert r.status_code == 200
    args, _kwargs = fake.upload_file.call_args
    assert args[1] == f"events/{e.id}/cover.png"


def test_get_event_image_not_found(client, db_session):
    e = _event(db_session, "Sans image")
    r = client.get(f"{BASE}/{e.id}/image")
    assert r.status_code == 404


# ── Export CSV des inscriptions ─────────────────────────────────────────────────


def test_export_registrations_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("export_noperm@test.com", church_id)
    e = _event(db_session, "Export protégé")
    r = client.get(
        f"{BASE}/{e.id}/registrations/export", headers=auth_header("export_noperm@test.com")
    )
    assert r.status_code == 403


def test_export_registrations_csv_content(client, make_user, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    e = _event(db_session, "Export CSV")
    make_member("exp1@test.com", church_id)
    make_member("exp2@test.com", church_id)

    client.post(f"{BASE}/{e.id}/register", headers=auth_header("exp1@test.com"))
    client.post(f"{BASE}/{e.id}/register", headers=auth_header("exp2@test.com"))
    client.delete(f"{BASE}/{e.id}/register", headers=auth_header("exp2@test.com"))

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/{e.id}/registrations/export", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert f"inscriptions-evenement-{e.id}.csv" in r.headers["content-disposition"]

    body = r.content.decode("utf-8-sig")
    lines = body.strip().splitlines()
    assert lines[0] == "Prénom,Nom,Courriel,Statut,Date d'inscription"
    assert any("exp1@test.com" in line and "confirmed" in line for line in lines[1:])
    assert any("exp2@test.com" in line and "cancelled" in line for line in lines[1:])


# ── Statistiques admin ────────────────────────────────────────────────────────


def test_events_stats_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("stats_noperm@test.com", church_id)
    r = client.get(f"{BASE}/admin/stats", headers=auth_header("stats_noperm@test.com"))
    assert r.status_code == 403


def test_events_stats_top_events_and_breakdown(client, make_user, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    e1 = _event(db_session, "Populaire", status=EventStatus.published)
    e2 = _event(db_session, "Peu populaire", status=EventStatus.published)
    _event(db_session, "Brouillon 1", status=EventStatus.draft)
    _event(db_session, "Brouillon 2", status=EventStatus.draft)
    _event(db_session, "Annulé", status=EventStatus.cancelled)

    make_member("stat1@test.com", church_id)
    make_member("stat2@test.com", church_id)
    make_member("stat3@test.com", church_id)

    client.post(f"{BASE}/{e1.id}/register", headers=auth_header("stat1@test.com"))
    client.post(f"{BASE}/{e1.id}/register", headers=auth_header("stat2@test.com"))
    client.post(f"{BASE}/{e1.id}/register", headers=auth_header("stat3@test.com"))
    client.post(f"{BASE}/{e2.id}/register", headers=auth_header("stat1@test.com"))

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin/stats", headers=h)
    assert r.status_code == 200
    body = r.json()

    top = body["top_events"]
    assert top[0]["title"] == "Populaire"
    assert top[0]["registered_count"] == 3
    assert top[1]["title"] == "Peu populaire"
    assert top[1]["registered_count"] == 1

    breakdown = {row["status"]: row["count"] for row in body["status_breakdown"]}
    assert breakdown["draft"] == 2
    assert breakdown["published"] == 2
    assert breakdown["cancelled"] == 1
    assert breakdown["completed"] == 0


def test_get_event_image_returns_url(client, make_user, auth_header, db_session):
    e = _event(db_session, "Avec image lecture")
    h = _admin_header(make_user, auth_header)
    fake = _fake_storage()
    with patch("app.api.routes.events.storage", fake):
        client.post(
            f"{BASE}/{e.id}/image", headers=h, files={"file": ("cover.png", b"data", "image/png")}
        )
        r = client.get(f"{BASE}/{e.id}/image")
    assert r.status_code == 200
    assert r.json()["url"] == "http://fake-storage/events/cover.jpg"
