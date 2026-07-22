import re
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from sqlalchemy import select

from app.models.church import Church
from app.models.event import Event, EventFormat, EventRegistration, EventStatus, RegistrationStatus
from app.models.rbac import Permission, Role, UserRole
from app.core.security import create_cancel_registration_token

BASE = "/api/events"


# ── Helpers ────────────────────────────────────────────────────────────────────


def _event(
    db_session,
    title="Conférence Test",
    category="Conférence",
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


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _ensure_organisateur_role(db) -> Role:
    """Get-or-create le rôle « organisateur » (event:manage uniquement), tel que
    créé via le mécanisme RBAC existant (POST /admin/roles + permissions)."""
    role = db.scalar(select(Role).where(Role.name == "organisateur"))
    if role is None:
        perm = db.scalar(select(Permission).where(Permission.code == "event:manage"))
        role = Role(name="organisateur", description="Organisateur d'événements", permissions=[perm])
        db.add(role)
        db.flush()
    return role


def _organisateur(make_user, auth_header, db_session, email):
    """Crée un compte autonome (aucune fiche membre) avec le seul rôle organisateur,
    porté sur l'église mère — mirroring un compte créé via le panneau Utilisateurs."""
    user = make_user(email)
    role = _ensure_organisateur_role(db_session)
    db_session.add(UserRole(user_id=user.id, role_id=role.id, church_id=_mother_id(db_session)))
    db_session.flush()
    return user, auth_header(email)


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
    _event(db_session, "Conférence A", category="Conférence")
    _event(db_session, "Formation B", category="Formation")

    r = client.get(f"{BASE}/?category=Formation")
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
    assert body["category"] == "Conférence"
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
        "category": "Conférence",
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


def test_create_event_with_zeffy_form_path(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["price"] = 40
    payload["zeffy_form_path"] = "/fr/donation-form/yyyy"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    assert r.json()["zeffy_form_path"] == "/fr/donation-form/yyyy"


def test_create_event_with_past_date_rejected(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["date_start"] = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 422


def test_create_formation_category_as_admin(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["category"] = "Formation"
    payload["instructor"] = "Formateur X"
    payload["price"] = 25
    payload["capacity"] = 10
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["category"] == "Formation"
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


def test_register_rejected_for_paid_event_without_zeffy(client, db_session):
    e = _event(db_session, "Payant sans Zeffy")
    e.price = 25
    db_session.flush()
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Payeur", "last_name": "Un", "email": "payeur1@test.com"},
    )
    assert r.status_code == 400
    assert "pas encore configuré" in r.json()["detail"]


def test_register_rejected_for_paid_event_with_zeffy_configured(client, db_session):
    """Même formulaire Zeffy configuré, l'inscription interne gratuite reste refusée :
    le paiement doit passer par le formulaire Zeffy, pas par cette route."""
    e = _event(db_session, "Payant avec Zeffy")
    e.price = 25
    e.zeffy_form_path = "/fr/donation-form/xxxx"
    db_session.flush()
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Payeur", "last_name": "Deux", "email": "payeur2@test.com"},
    )
    assert r.status_code == 400


def test_register_allowed_for_free_event(client, db_session):
    e = _event(db_session, "Gratuit explicite")
    e.price = 0
    db_session.flush()
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Gratuit", "last_name": "Test", "email": "gratuit@test.com"},
    )
    assert r.status_code == 201


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


# ── Délai d'annulation ───────────────────────────────────────────────────────


def test_cancel_registration_blocked_after_deadline(client, make_member, auth_header, db_session):
    """Délai par défaut : 24h. Un événement dans 2h ne peut plus être annulé."""
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("cancel_late@test.com", church_id)
    e = _event(db_session, "Bientôt", days_from_now=2 / 24)
    h = auth_header("cancel_late@test.com")

    client.post(f"{BASE}/{e.id}/register", headers=h)
    r = client.delete(f"{BASE}/{e.id}/register", headers=h)
    assert r.status_code == 400
    assert "délai" in r.json()["detail"].lower()


def test_cancel_registration_allowed_before_deadline(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("cancel_ok@test.com", church_id)
    e = _event(db_session, "Loin", days_from_now=30)
    h = auth_header("cancel_ok@test.com")

    client.post(f"{BASE}/{e.id}/register", headers=h)
    r = client.delete(f"{BASE}/{e.id}/register", headers=h)
    assert r.status_code == 204


def test_cancel_deadline_uses_per_event_setting(client, make_member, auth_header, db_session):
    """Un cancel_deadline_hours de 1h propre à l'événement permet d'annuler dans 2h,
    même si le défaut global (24h) l'aurait bloqué."""
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("cancel_custom@test.com", church_id)
    e = _event(db_session, "Réglage personnalisé", days_from_now=2 / 24)
    e.cancel_deadline_hours = 1
    db_session.flush()
    h = auth_header("cancel_custom@test.com")

    client.post(f"{BASE}/{e.id}/register", headers=h)
    r = client.delete(f"{BASE}/{e.id}/register", headers=h)
    assert r.status_code == 204


def test_cancel_deadline_defaults_to_24h_when_unset(
    client, make_member, auth_header, db_session
):
    """Sans cancel_deadline_hours explicite sur l'événement, le défaut (24h) s'applique."""
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("cancel_default@test.com", church_id)
    e = _event(db_session, "Sans réglage", days_from_now=2 / 24)
    assert e.cancel_deadline_hours is None
    h = auth_header("cancel_default@test.com")

    client.post(f"{BASE}/{e.id}/register", headers=h)
    r = client.delete(f"{BASE}/{e.id}/register", headers=h)
    assert r.status_code == 400


# ── Message de confirmation personnalisé ──────────────────────────────────────


def test_confirmation_message_substitution(client, fake_email, db_session):
    e = _event(db_session, "Soirée spéciale", days_from_now=10)
    e.confirmation_message = (
        "Salut {prenom} ! « {titre} » aura lieu le {date}. "
        "Annulation possible jusqu'à {delai}h avant."
    )
    e.cancel_deadline_hours = 12
    db_session.flush()

    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Alice", "last_name": "Martin", "email": "custom_confirm@test.com"},
    )
    assert r.status_code == 201
    assert fake_email.sent
    body = fake_email.sent[0][2]
    assert "Salut Alice !" in body
    assert "Soirée spéciale" in body
    assert "12h avant" in body
    assert "{prenom}" not in body


def test_confirmation_message_default_when_unset(client, fake_email, db_session):
    e = _event(db_session, "Sans message personnalisé", days_from_now=10)
    assert e.confirmation_message is None

    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Bob", "last_name": "Sansmessage", "email": "default_confirm@test.com"},
    )
    assert r.status_code == 201
    body = fake_email.sent[0][2]
    assert "Nous avons bien reçu votre inscription" in body


# ── Annulation par jeton (invité sans compte) ─────────────────────────────────


def test_cancel_registration_by_token_guest(client, db_session):
    e = _event(db_session, "Jeton invité", days_from_now=30)
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Guest", "last_name": "User", "email": "guest_token@test.com"},
    )
    assert r.status_code == 201
    reg_id = r.json()["id"]
    token = create_cancel_registration_token(reg_id, expires_at=e.date_start)

    r2 = client.delete(f"{BASE}/registrations/cancel", params={"token": token})
    assert r2.status_code == 204

    detail = client.get(f"{BASE}/{e.id}").json()
    assert detail["registered_count"] == 0


def test_cancel_registration_by_token_blocked_after_deadline(client, db_session):
    e = _event(db_session, "Jeton bientôt", days_from_now=2 / 24)
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Guest", "last_name": "Late", "email": "guest_late@test.com"},
    )
    reg_id = r.json()["id"]
    token = create_cancel_registration_token(reg_id, expires_at=e.date_start)

    r2 = client.delete(f"{BASE}/registrations/cancel", params={"token": token})
    assert r2.status_code == 400


def test_cancel_registration_by_invalid_token_rejected(client):
    r = client.delete(f"{BASE}/registrations/cancel", params={"token": "not-a-real-token"})
    assert r.status_code == 400


# ── Retrouver mon inscription (invité sans compte) ────────────────────────────


def test_resend_cancel_link_existing_confirmed_registration(client, fake_email, db_session):
    e = _event(db_session, "Retrouver inscription", days_from_now=30)
    client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Lost", "last_name": "Email", "email": "lost_email@test.com"},
    )
    fake_email.sent.clear()

    r = client.post(
        f"{BASE}/{e.id}/registrations/resend-cancel-link",
        json={"email": "lost_email@test.com"},
    )
    assert r.status_code == 204
    assert fake_email.sent
    assert fake_email.sent[0][0] == "lost_email@test.com"


def test_resend_cancel_link_unknown_email_same_response(client, fake_email, db_session):
    e = _event(db_session, "Retrouver inscription 2", days_from_now=30)
    r = client.post(
        f"{BASE}/{e.id}/registrations/resend-cancel-link",
        json={"email": "never_registered@test.com"},
    )
    assert r.status_code == 204
    assert not fake_email.sent


def test_resend_cancel_link_response_identical_whether_registered_or_not(client, db_session):
    e = _event(db_session, "Retrouver inscription 3", days_from_now=30)
    client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Known", "last_name": "Email", "email": "known_email@test.com"},
    )

    r_known = client.post(
        f"{BASE}/{e.id}/registrations/resend-cancel-link",
        json={"email": "known_email@test.com"},
    )
    r_unknown = client.post(
        f"{BASE}/{e.id}/registrations/resend-cancel-link",
        json={"email": "unknown_email@test.com"},
    )
    assert r_known.status_code == r_unknown.status_code == 204
    assert r_known.content == r_unknown.content == b""


def test_resend_cancel_link_ignores_cancelled_registration(client, fake_email, db_session):
    e = _event(db_session, "Retrouver inscription annulée", days_from_now=30)
    reg_resp = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Cancelled", "last_name": "Reg", "email": "cancelled_reg@test.com"},
    )
    registration = db_session.get(EventRegistration, reg_resp.json()["id"])
    registration.status = RegistrationStatus.cancelled
    db_session.flush()
    fake_email.sent.clear()

    r = client.post(
        f"{BASE}/{e.id}/registrations/resend-cancel-link",
        json={"email": "cancelled_reg@test.com"},
    )
    assert r.status_code == 204
    assert not fake_email.sent


def test_resend_cancel_link_new_token_actually_cancels(client, fake_email, db_session):
    """Le nouveau lien renvoyé par courriel doit permettre d'annuler l'inscription."""
    e = _event(db_session, "Jeton renvoyé fonctionnel", days_from_now=30)
    client.post(
        f"{BASE}/{e.id}/register",
        json={
            "first_name": "Functional",
            "last_name": "Token",
            "email": "functional_token@test.com",
        },
    )
    fake_email.sent.clear()

    client.post(
        f"{BASE}/{e.id}/registrations/resend-cancel-link",
        json={"email": "functional_token@test.com"},
    )
    body = fake_email.sent[0][2]
    match = re.search(r"cancel_token=([\w\-.]+)", body)
    assert match is not None
    token = match.group(1)

    r = client.delete(f"{BASE}/registrations/cancel", params={"token": token})
    assert r.status_code == 204


def test_resend_cancel_link_unknown_event_404(client):
    r = client.post(
        f"{BASE}/999999/registrations/resend-cancel-link", json={"email": "x@test.com"}
    )
    assert r.status_code == 404


# ── Format en ligne ────────────────────────────────────────────────────────────


def test_create_event_online_without_link_rejected(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["format"] = "en_ligne"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 422


def test_create_event_online_with_link_succeeds(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["format"] = "en_ligne"
    payload["online_link"] = "https://zoom.us/j/123456"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["format"] == "en_ligne"
    assert body["online_link"] == "https://zoom.us/j/123456"


def test_update_event_to_online_without_link_rejected(client, make_user, auth_header, db_session):
    e = _event(db_session, "Devient en ligne")
    h = _admin_header(make_user, auth_header)
    r = client.put(f"{BASE}/{e.id}", json={"format": "en_ligne"}, headers=h)
    assert r.status_code == 422


def test_update_event_to_online_with_link_succeeds(client, make_user, auth_header, db_session):
    e = _event(db_session, "Devient en ligne 2")
    h = _admin_header(make_user, auth_header)
    r = client.put(
        f"{BASE}/{e.id}",
        json={"format": "en_ligne", "online_link": "https://meet.google.com/abc"},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["online_link"] == "https://meet.google.com/abc"


def test_public_list_hides_online_link(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["title"] = "En ligne publique"
    payload["format"] = "en_ligne"
    payload["online_link"] = "https://secret-link.example/xyz"
    client.post(f"{BASE}/", json=payload, headers=h)

    r = client.get(f"{BASE}/")
    item = next(e for e in r.json()["items"] if e["title"] == "En ligne publique")
    assert item["format"] == "en_ligne"
    assert item["online_link"] is None


def test_public_detail_hides_online_link(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["title"] = "En ligne détail public"
    payload["format"] = "en_ligne"
    payload["online_link"] = "https://secret-link.example/detail"
    created = client.post(f"{BASE}/", json=payload, headers=h).json()

    r = client.get(f"{BASE}/{created['id']}")
    assert r.status_code == 200
    assert r.json()["online_link"] is None


def test_admin_list_reveals_online_link(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["title"] = "En ligne admin"
    payload["format"] = "en_ligne"
    payload["online_link"] = "https://secret-link.example/admin"
    client.post(f"{BASE}/", json=payload, headers=h)

    r = client.get(f"{BASE}/admin", headers=h)
    item = next(e for e in r.json()["items"] if e["title"] == "En ligne admin")
    assert item["online_link"] == "https://secret-link.example/admin"


def test_register_response_includes_online_link_for_online_event(client, db_session):
    e = _event(db_session, "Webinaire")
    e.format = EventFormat.en_ligne
    e.online_link = "https://zoom.us/j/webinaire"
    db_session.flush()

    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Ann", "last_name": "Line", "email": "online_guest@test.com"},
    )
    assert r.status_code == 201
    assert r.json()["online_link"] == "https://zoom.us/j/webinaire"


def test_register_response_no_online_link_for_in_person_event(client, db_session):
    e = _event(db_session, "Présentiel")
    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Sam", "last_name": "Place", "email": "in_person_guest@test.com"},
    )
    assert r.status_code == 201
    assert r.json()["online_link"] is None


def test_my_registrations_includes_online_link_for_online_event(
    client, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("my_online_reg@test.com", church_id)
    e = _event(db_session, "Webinaire mes inscriptions")
    e.format = EventFormat.en_ligne
    e.online_link = "https://zoom.us/j/mesinscriptions"
    db_session.flush()

    h = auth_header("my_online_reg@test.com")
    client.post(f"{BASE}/{e.id}/register", headers=h)

    r = client.get(f"{BASE}/registrations/me", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body[0]["event"]["format"] == "en_ligne"
    assert body[0]["event"]["online_link"] == "https://zoom.us/j/mesinscriptions"


# ── Format hybride ─────────────────────────────────────────────────────────────


def test_create_event_hybride_without_link_rejected(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["format"] = "hybride"
    payload["location"] = "Église mère"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 422


def test_create_event_hybride_without_location_rejected(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["format"] = "hybride"
    payload["location"] = None
    payload["online_link"] = "https://zoom.us/j/hybride"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 422


def test_create_event_hybride_with_both_succeeds(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["format"] = "hybride"
    payload["location"] = "Église mère"
    payload["online_link"] = "https://zoom.us/j/hybride"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["format"] == "hybride"
    assert body["location"] == "Église mère"
    assert body["online_link"] == "https://zoom.us/j/hybride"


def test_public_hides_online_link_for_hybride_event(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["title"] = "Hybride publique"
    payload["format"] = "hybride"
    payload["location"] = "Église mère"
    payload["online_link"] = "https://secret-link.example/hybride"
    client.post(f"{BASE}/", json=payload, headers=h)

    r = client.get(f"{BASE}/")
    item = next(e for e in r.json()["items"] if e["title"] == "Hybride publique")
    assert item["format"] == "hybride"
    assert item["location"] == "Église mère"
    assert item["online_link"] is None


def test_register_response_includes_online_link_for_hybride_event(client, db_session):
    e = _event(db_session, "Conférence hybride")
    e.format = EventFormat.hybride
    e.location = "Église mère"
    e.online_link = "https://zoom.us/j/hybride-reg"
    db_session.flush()

    r = client.post(
        f"{BASE}/{e.id}/register",
        json={"first_name": "Hy", "last_name": "Bride", "email": "hybride_guest@test.com"},
    )
    assert r.status_code == 201
    assert r.json()["online_link"] == "https://zoom.us/j/hybride-reg"


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
    e = _event(db_session, "Formation héritée", category="Formation")

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
    assert body[0]["event"]["category"] == "Formation"


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


# ── Catégorie d'intervenant ────────────────────────────────────────────────────


def test_create_event_with_intervenant_category(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["instructor"] = "Pasteur Bruel"
    payload["intervenant_category"] = "Pasteur"
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["instructor"] == "Pasteur Bruel"
    assert body["intervenant_category"] == "Pasteur"


def test_event_without_intervenant_category_defaults_to_none(client, db_session):
    e = _event(db_session, "Sans intervenant")
    r = client.get(f"{BASE}/{e.id}")
    assert r.json()["intervenant_category"] is None


# ── Nombre d'inscrits visible ou non ───────────────────────────────────────────


def test_create_event_show_registration_count_defaults_true(
    client, make_user, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    r = client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    assert r.status_code == 201
    assert r.json()["show_registration_count"] is True


def test_create_event_show_registration_count_false(client, make_user, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    h = _admin_header(make_user, auth_header)
    payload = _payload(church_id)
    payload["show_registration_count"] = False
    r = client.post(f"{BASE}/", json=payload, headers=h)
    assert r.status_code == 201
    assert r.json()["show_registration_count"] is False


def test_update_event_show_registration_count(client, make_user, auth_header, db_session):
    e = _event(db_session, "Compteur visible")
    h = _admin_header(make_user, auth_header)
    r = client.put(f"{BASE}/{e.id}", json={"show_registration_count": False}, headers=h)
    assert r.status_code == 200
    assert r.json()["show_registration_count"] is False


# ── Rôle Organisateur ──────────────────────────────────────────────────────────


def test_organisateur_can_create_event(client, make_user, auth_header, db_session):
    user, h = _organisateur(make_user, auth_header, db_session, "orga1@test.com")
    church_id = _mother_id(db_session)
    r = client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    assert r.status_code == 201
    assert r.json()["created_by"] == user.id


def test_organisateur_does_not_see_other_organisateur_event_in_admin_list(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_a@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_b@test.com")
    church_id = _mother_id(db_session)

    payload_a = _payload(church_id)
    payload_a["title"] = "Événement A"
    client.post(f"{BASE}/", json=payload_a, headers=h_a)

    payload_b = _payload(church_id)
    payload_b["title"] = "Événement B"
    client.post(f"{BASE}/", json=payload_b, headers=h_b)

    r = client.get(f"{BASE}/admin", headers=h_a)
    assert r.status_code == 200
    titles = [e["title"] for e in r.json()["items"]]
    assert "Événement A" in titles
    assert "Événement B" not in titles


def test_organisateur_cannot_update_other_organisateur_event(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_c@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_d@test.com")
    church_id = _mother_id(db_session)

    created = client.post(f"{BASE}/", json=_payload(church_id), headers=h_b).json()

    r = client.put(f"{BASE}/{created['id']}", json={"title": "Piraté"}, headers=h_a)
    assert r.status_code == 403


def test_organisateur_cannot_delete_other_organisateur_event(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_e@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_f@test.com")
    church_id = _mother_id(db_session)

    created = client.post(f"{BASE}/", json=_payload(church_id), headers=h_b).json()

    r = client.delete(f"{BASE}/{created['id']}", headers=h_a)
    assert r.status_code == 403


def test_organisateur_cannot_view_participants_of_other_organisateur_event(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_g@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_h@test.com")
    church_id = _mother_id(db_session)

    created = client.post(f"{BASE}/", json=_payload(church_id), headers=h_b).json()

    r = client.get(f"{BASE}/{created['id']}/participants", headers=h_a)
    assert r.status_code == 403


def test_organisateur_cannot_export_registrations_of_other_organisateur_event(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_m@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_n@test.com")
    church_id = _mother_id(db_session)

    created = client.post(f"{BASE}/", json=_payload(church_id), headers=h_b).json()

    r = client.get(f"{BASE}/{created['id']}/registrations/export", headers=h_a)
    assert r.status_code == 403


def test_organisateur_cannot_upload_image_for_other_organisateur_event(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_o@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_p@test.com")
    church_id = _mother_id(db_session)

    created = client.post(f"{BASE}/", json=_payload(church_id), headers=h_b).json()

    r = client.post(
        f"{BASE}/{created['id']}/image",
        headers=h_a,
        files={"file": ("cover.jpg", b"fakeimage", "image/jpeg")},
    )
    assert r.status_code == 403


def test_organisateur_can_update_own_event(client, make_user, auth_header, db_session):
    _user, h = _organisateur(make_user, auth_header, db_session, "orga_i@test.com")
    church_id = _mother_id(db_session)
    created = client.post(f"{BASE}/", json=_payload(church_id), headers=h).json()

    r = client.put(f"{BASE}/{created['id']}", json={"title": "Modifié"}, headers=h)
    assert r.status_code == 200
    assert r.json()["title"] == "Modifié"


def test_admin_sees_all_events_regardless_of_creator(
    client, make_user, auth_header, db_session
):
    _user, h_orga = _organisateur(make_user, auth_header, db_session, "orga_j@test.com")
    church_id = _mother_id(db_session)
    payload = _payload(church_id)
    payload["title"] = "Créé par organisateur"
    client.post(f"{BASE}/", json=payload, headers=h_orga)

    admin_h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=admin_h)
    titles = [e["title"] for e in r.json()["items"]]
    assert "Créé par organisateur" in titles


def test_organisateur_stats_scoped_to_own_events(client, make_user, auth_header, db_session):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orga_k@test.com")
    _user_b, h_b = _organisateur(make_user, auth_header, db_session, "orga_l@test.com")
    church_id = _mother_id(db_session)

    payload_a = _payload(church_id)
    payload_a["title"] = "Stats A"
    client.post(f"{BASE}/", json=payload_a, headers=h_a)

    payload_b = _payload(church_id)
    payload_b["title"] = "Stats B"
    client.post(f"{BASE}/", json=payload_b, headers=h_b)

    r = client.get(f"{BASE}/admin/stats", headers=h_a)
    assert r.status_code == 200
    breakdown_total = sum(row["count"] for row in r.json()["status_breakdown"])
    assert breakdown_total == 1
