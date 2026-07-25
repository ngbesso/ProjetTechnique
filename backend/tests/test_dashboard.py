from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.church import Church
from app.models.donation import Donation, DonationCurrency
from app.models.event import Event, EventRegistration, EventStatus
from app.models.member import Member, MemberStatus
from app.models.prayer_request import PrayerRequest, PrayerRequestStatus
from app.models.sermon import Sermon, SermonStatus
from app.models.volunteer_request import VolunteerRequest, VolunteerRequestStatus

BASE = "/admin/dashboard"

# Timestamp far in the future so test-created rows always rank first in the
# recent-activity feed, regardless of any other data (seed data, leftovers
# from other tests, etc.) — makes ordering assertions deterministic.
FUTURE = datetime(2099, 1, 1, tzinfo=timezone.utc)


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _admin_header(make_user, auth_header):
    make_user("admin_dash@test.com", roles=["admin"])
    return auth_header("admin_dash@test.com")


def _event(db_session, title="Événement Test", status=EventStatus.published):
    e = Event(
        title=title,
        date_start=datetime.now(timezone.utc) + timedelta(days=5),
        status=status,
    )
    db_session.add(e)
    db_session.flush()
    return e


# ── Accès ──────────────────────────────────────────────────────────────────────


def test_requires_admin(client, make_member, auth_header, db_session):
    church_id = _mother_id(db_session)
    make_member("plain_dash@test.com", church_id)
    r = client.get(BASE, headers=auth_header("plain_dash@test.com"))
    assert r.status_code == 403


def test_requires_auth(client):
    assert client.get(BASE).status_code == 401


# ── Membres en attente ───────────────────────────────────────────────────────


def test_membres_pending_count(client, make_user, auth_header, db_session):
    church_id = _mother_id(db_session)
    db_session.add(Member(
        church_id=church_id, first_name="P", last_name="Pending",
        email="pendcount@test.com", status=MemberStatus.pending,
    ))
    db_session.add(Member(
        church_id=church_id, first_name="A", last_name="Active",
        email="activecount@test.com", status=MemberStatus.active,
    ))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    assert r.status_code == 200
    assert r.json()["membres_pending"] == 1


# ── Demandes de prière ───────────────────────────────────────────────────────


def test_prieres_pending_and_recent(client, make_user, make_member, auth_header, db_session):
    church_id = _mother_id(db_session)
    m = make_member("praydash@test.com", church_id)
    db_session.add(PrayerRequest(member_id=m.id, message="Nouvelle", status=PrayerRequestStatus.new))
    db_session.add(PrayerRequest(member_id=m.id, message="Traitée", status=PrayerRequestStatus.handled))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    body = r.json()["prieres"]
    assert body["pending"] == 1
    assert len(body["recent"]) == 1
    assert body["recent"][0]["member_name"] == m.full_name


# ── Demandes de bénévolat ────────────────────────────────────────────────────


def test_benevolat_pending_and_recent(client, make_user, make_member, auth_header, db_session):
    church_id = _mother_id(db_session)
    m = make_member("voldash@test.com", church_id)
    e = _event(db_session, "Événement Bénévolat")
    db_session.add(VolunteerRequest(member_id=m.id, event_id=e.id, status=VolunteerRequestStatus.pending))
    db_session.add(VolunteerRequest(member_id=m.id, event_id=e.id, status=VolunteerRequestStatus.approved))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    body = r.json()["benevolat"]
    assert body["pending"] == 1
    assert len(body["recent"]) == 1
    assert body["recent"][0]["event_title"] == "Événement Bénévolat"


# ── Activité récente : présence par type ─────────────────────────────────────


def test_activity_includes_new_member(client, make_user, make_member, auth_header, db_session):
    church_id = _mother_id(db_session)
    m = make_member("actmember@test.com", church_id)
    m.first_name = "Alizée"
    m.last_name = "Futur"
    m.created_at = FUTURE
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    top = r.json()["recent_activity"][0]
    assert top["type"] == "member"
    assert "Alizée Futur" in top["label"]


def test_activity_includes_donation_with_currency_value(
    client, make_user, auth_header, db_session
):
    """Vérifie que la devise est rendue comme 'CAD' et non 'DonationCurrency.CAD'."""
    db_session.add(Donation(
        amount=75.5, currency=DonationCurrency.CAD, donor_name="Généreux Donateur",
        payment_status="succeeded", created_at=FUTURE,
    ))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    top = r.json()["recent_activity"][0]
    assert top["type"] == "donation"
    assert "75.50 $ CAD" in top["label"]
    assert "Généreux Donateur" in top["label"]
    assert "DonationCurrency" not in top["label"]


def test_activity_includes_published_sermon_only(client, make_user, auth_header, db_session):
    db_session.add(Sermon(
        title="Sermon Vedette", preacher="Past. X", sermon_date="2026-01-01",
        format="audio", file_key="k1", status=SermonStatus.published, created_at=FUTURE,
    ))
    db_session.add(Sermon(
        title="Brouillon Caché", preacher="Past. X", sermon_date="2026-01-01",
        format="audio", file_key="k2", status=SermonStatus.draft, created_at=FUTURE,
    ))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    labels = [a["label"] for a in r.json()["recent_activity"]]
    assert any("Sermon Vedette" in la for la in labels)
    assert not any("Brouillon Caché" in la for la in labels)


def test_activity_includes_event_registration(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("actreg@test.com", church_id)
    e = _event(db_session, "Camp Vedette")
    db_session.add(EventRegistration(
        event_id=e.id, first_name="Activité", last_name="Test",
        email="actreg@test.com", registered_at=FUTURE,
    ))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    top = r.json()["recent_activity"][0]
    assert top["type"] == "event_registration"
    assert "Camp Vedette" in top["label"]


def test_activity_includes_prayer_request(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    m = make_member("actpray@test.com", church_id)
    db_session.add(PrayerRequest(member_id=m.id, message="Une prière", created_at=FUTURE))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    top = r.json()["recent_activity"][0]
    assert top["type"] == "prayer_request"
    assert m.full_name in top["label"]


def test_activity_includes_volunteer_request(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    m = make_member("actvol@test.com", church_id)
    e = _event(db_session, "Croisade Vedette")
    db_session.add(VolunteerRequest(member_id=m.id, event_id=e.id, created_at=FUTURE))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    top = r.json()["recent_activity"][0]
    assert top["type"] == "volunteer_request"
    assert m.full_name in top["label"]
    assert "Croisade Vedette" in top["label"]


# ── Activité récente : tri et plafond ────────────────────────────────────────


def test_recent_activity_sorted_descending(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    dates = [a["date"] for a in r.json()["recent_activity"]]
    assert dates == sorted(dates, reverse=True)


def test_recent_activity_capped_at_10(client, make_user, auth_header, db_session):
    church_id = _mother_id(db_session)
    for i in range(15):
        db_session.add(Member(
            church_id=church_id, first_name=f"M{i}", last_name="Cap",
            email=f"cap{i}@test.com", status=MemberStatus.active,
            created_at=FUTURE - timedelta(seconds=i),
        ))
    db_session.flush()

    h = _admin_header(make_user, auth_header)
    r = client.get(BASE, headers=h)
    assert len(r.json()["recent_activity"]) == 10
