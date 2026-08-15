from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.models.church import Church
from app.models.event import Event, EventStatus
from app.models.rbac import Role, UserRole

BASE = "/volunteer-requests"
EVENTS_BASE = "/events"


def _event(db_session, title="Événement Test", status=EventStatus.published):
    e = Event(
        title=title,
        date_start=datetime.now(timezone.utc) + timedelta(days=5),
        status=status,
    )
    db_session.add(e)
    db_session.flush()
    return e


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _admin_header(make_user, auth_header):
    make_user("admin_vol@test.com", roles=["admin"])
    return auth_header("admin_vol@test.com")


def _volunteer_event(
    db_session,
    title,
    *,
    capacity=None,
    auto_approve=False,
    church_id=None,
    created_by=None,
    status=EventStatus.published,
    days_ahead=5,
):
    e = Event(
        title=title,
        date_start=datetime.now(timezone.utc) + timedelta(days=days_ahead),
        status=status,
        volunteer_capacity=capacity,
        volunteer_auto_approve=auto_approve,
        church_id=church_id,
        created_by=created_by,
    )
    db_session.add(e)
    db_session.flush()
    return e


def _organisateur(make_user, auth_header, db_session, email):
    """Compte autonome avec le seul rôle organisateur, porté sur l'église mère."""
    user = make_user(email)
    role = db_session.scalar(select(Role).where(Role.name == "organisateur"))
    db_session.add(
        UserRole(user_id=user.id, role_id=role.id, church_id=_mother_id(db_session))
    )
    db_session.flush()
    return user, auth_header(email)


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


# ── Capacité et auto-approbation ─────────────────────────────────────────────


def test_auto_approve_stops_at_capacity_then_waitlists(
    client, make_member, auth_header, db_session
):
    """L'auto-approbation approuve jusqu'à la capacité, puis les demandes
    suivantes restent en attente (liste d'attente)."""
    church_id = _mother_id(db_session)
    event = _volunteer_event(db_session, "Capacité 2", capacity=2, auto_approve=True)

    statuses = []
    for i in range(3):
        make_member(f"autovol{i}@test.com", church_id)
        r = client.post(
            BASE, json={"event_id": event.id}, headers=auth_header(f"autovol{i}@test.com")
        )
        assert r.status_code == 201
        statuses.append(r.json()["status"])

    assert statuses == ["approved", "approved", "pending"]


def test_auto_approve_without_capacity_is_unlimited(
    client, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    event = _volunteer_event(db_session, "Sans limite", capacity=None, auto_approve=True)

    for i in range(3):
        make_member(f"unlimitedvol{i}@test.com", church_id)
        r = client.post(
            BASE,
            json={"event_id": event.id},
            headers=auth_header(f"unlimitedvol{i}@test.com"),
        )
        assert r.json()["status"] == "approved"


def test_without_auto_approve_stays_pending_even_with_capacity(
    client, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    event = _volunteer_event(db_session, "Revue manuelle", capacity=5, auto_approve=False)
    make_member("manualvol@test.com", church_id)

    r = client.post(
        BASE, json={"event_id": event.id}, headers=auth_header("manualvol@test.com")
    )
    assert r.json()["status"] == "pending"


def test_auto_approved_member_is_notified(
    client, make_member, auth_header, db_session, fake_email
):
    church_id = _mother_id(db_session)
    event = _volunteer_event(db_session, "Notif auto", capacity=1, auto_approve=True)
    make_member("notifvol@test.com", church_id)

    client.post(BASE, json={"event_id": event.id}, headers=auth_header("notifvol@test.com"))

    assert any(to == "notifvol@test.com" for to, *_ in fake_email.sent)


# ── Périmètre de l'organisateur ──────────────────────────────────────────────


def test_organisateur_does_not_see_requests_of_other_organisateur_event(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    user_a, h_a = _organisateur(make_user, auth_header, db_session, "orgavol_a@test.com")
    user_b, _h_b = _organisateur(make_user, auth_header, db_session, "orgavol_b@test.com")

    event_a = _volunteer_event(db_session, "Événement de A", created_by=user_a.id)
    event_b = _volunteer_event(db_session, "Événement de B", created_by=user_b.id)

    make_member("volscope1@test.com", church_id)
    make_member("volscope2@test.com", church_id)
    client.post(BASE, json={"event_id": event_a.id}, headers=auth_header("volscope1@test.com"))
    client.post(BASE, json={"event_id": event_b.id}, headers=auth_header("volscope2@test.com"))

    r = client.get(f"{BASE}/admin", headers=h_a)
    assert r.status_code == 200
    event_ids = {item["event_id"] for item in r.json()}
    assert event_a.id in event_ids
    assert event_b.id not in event_ids


def test_organisateur_cannot_update_request_of_other_organisateur_event(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orgavol_c@test.com")
    user_b, _h_b = _organisateur(make_user, auth_header, db_session, "orgavol_d@test.com")

    event_b = _volunteer_event(db_session, "Événement de B (patch)", created_by=user_b.id)
    make_member("volscope3@test.com", church_id)
    created = client.post(
        BASE, json={"event_id": event_b.id}, headers=auth_header("volscope3@test.com")
    ).json()

    r = client.patch(f"{BASE}/{created['id']}", json={"status": "approved"}, headers=h_a)
    assert r.status_code == 403


def test_admin_sees_all_organisateur_requests(
    client, make_user, make_member, auth_header, db_session
):
    """Un admin global continue de tout voir, quel que soit le créateur."""
    church_id = _mother_id(db_session)
    user_a, _h_a = _organisateur(make_user, auth_header, db_session, "orgavol_e@test.com")
    event_a = _volunteer_event(db_session, "Événement admin-visible", created_by=user_a.id)

    make_member("volscope4@test.com", church_id)
    client.post(BASE, json={"event_id": event_a.id}, headers=auth_header("volscope4@test.com"))

    h_admin = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h_admin)
    assert r.status_code == 200
    assert event_a.id in {item["event_id"] for item in r.json()}


# ── GET /events/volunteer-opportunities ──────────────────────────────────────


def test_volunteer_opportunities_lists_open_events(client, db_session):
    event = _volunteer_event(db_session, "Cherche bénévoles", capacity=3)
    r = client.get(f"{EVENTS_BASE}/volunteer-opportunities")
    assert r.status_code == 200
    match = next((o for o in r.json() if o["event_id"] == event.id), None)
    assert match is not None
    assert match["volunteer_capacity"] == 3
    assert match["volunteer_spots_left"] == 3


def test_volunteer_opportunities_excludes_full_event(
    client, make_member, auth_header, db_session
):
    """Un événement dont la capacité est atteinte disparaît de la liste."""
    church_id = _mother_id(db_session)
    event = _volunteer_event(db_session, "Complet", capacity=1, auto_approve=True)

    assert any(
        o["event_id"] == event.id
        for o in client.get(f"{EVENTS_BASE}/volunteer-opportunities").json()
    )

    make_member("fullvol@test.com", church_id)
    client.post(BASE, json={"event_id": event.id}, headers=auth_header("fullvol@test.com"))

    assert all(
        o["event_id"] != event.id
        for o in client.get(f"{EVENTS_BASE}/volunteer-opportunities").json()
    )


def test_volunteer_opportunities_excludes_events_without_capacity(client, db_session):
    event = _volunteer_event(db_session, "Sans bénévolat", capacity=None)
    r = client.get(f"{EVENTS_BASE}/volunteer-opportunities")
    assert all(o["event_id"] != event.id for o in r.json())


def test_volunteer_opportunities_excludes_draft_and_past_events(client, db_session):
    draft = _volunteer_event(
        db_session, "Brouillon bénévoles", capacity=2, status=EventStatus.draft
    )
    past = _volunteer_event(db_session, "Passé bénévoles", capacity=2, days_ahead=-5)

    ids = {o["event_id"] for o in client.get(f"{EVENTS_BASE}/volunteer-opportunities").json()}
    assert draft.id not in ids
    assert past.id not in ids


# ── POST /events/{id}/volunteer-announcement ─────────────────────────────────


def test_announcement_targets_members_of_organizing_church(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    """L'annonce ne part qu'aux membres actifs de l'église organisatrice."""
    mother = _mother_id(db_session)
    other = Church(name="Église annonce", parent_id=mother)
    db_session.add(other)
    db_session.flush()

    make_member("annonce_mere@test.com", mother)
    make_member("annonce_autre@test.com", other.id)
    event = _volunteer_event(db_session, "Annonce ciblée", capacity=4, church_id=other.id)

    h = _admin_header(make_user, auth_header)
    fake_email.sent.clear()
    r = client.post(f"{EVENTS_BASE}/{event.id}/volunteer-announcement", headers=h)

    assert r.status_code == 200
    assert r.json()["recipients"] == 1
    recipients = {to for to, *_ in fake_email.sent}
    assert "annonce_autre@test.com" in recipients
    assert "annonce_mere@test.com" not in recipients


def test_announcement_without_church_targets_all_active_members(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    mother = _mother_id(db_session)
    make_member("annonce_all1@test.com", mother)
    make_member("annonce_all2@test.com", mother)
    event = _volunteer_event(db_session, "Annonce mission", capacity=4, church_id=None)

    h = _admin_header(make_user, auth_header)
    fake_email.sent.clear()
    r = client.post(f"{EVENTS_BASE}/{event.id}/volunteer-announcement", headers=h)

    assert r.status_code == 200
    recipients = {to for to, *_ in fake_email.sent}
    assert {"annonce_all1@test.com", "annonce_all2@test.com"} <= recipients


def test_announcement_rejected_when_event_has_no_volunteer_capacity(
    client, make_user, auth_header, db_session
):
    event = _volunteer_event(db_session, "Sans capacité", capacity=None)
    h = _admin_header(make_user, auth_header)
    r = client.post(f"{EVENTS_BASE}/{event.id}/volunteer-announcement", headers=h)
    assert r.status_code == 400


def test_announcement_refused_for_other_organisateur_event(
    client, make_user, auth_header, db_session
):
    _user_a, h_a = _organisateur(make_user, auth_header, db_session, "orgavol_f@test.com")
    user_b, _h_b = _organisateur(make_user, auth_header, db_session, "orgavol_g@test.com")
    event_b = _volunteer_event(db_session, "Annonce de B", capacity=2, created_by=user_b.id)

    r = client.post(f"{EVENTS_BASE}/{event_b.id}/volunteer-announcement", headers=h_a)
    assert r.status_code == 403
