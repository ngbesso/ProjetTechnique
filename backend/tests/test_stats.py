"""Tests pour GET /stats/public (comptages de la page d'accueil)."""

from sqlalchemy import select

from app.models.church import Church
from app.models.member import Member, MemberStatus


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _add_member(db, church_id, email, status=MemberStatus.active):
    db.add(
        Member(
            church_id=church_id,
            first_name="Test",
            last_name="Membre",
            email=email,
            status=status,
        )
    )
    db.flush()


def test_public_stats_needs_no_auth(client):
    r = client.get("/stats/public")
    assert r.status_code == 200
    assert set(r.json()) == {"active_churches", "affiliated_churches", "active_members"}


def test_affiliated_count_excludes_mother(client, db_session):
    before = client.get("/stats/public").json()["affiliated_churches"]
    db_session.add(Church(name="Affiliée A", parent_id=_mother_id(db_session)))
    db_session.flush()
    after = client.get("/stats/public").json()["affiliated_churches"]
    assert after == before + 1


def test_inactive_church_not_counted_as_active(client, db_session):
    before = client.get("/stats/public").json()["active_churches"]
    db_session.add(
        Church(name="Affiliée dormante", parent_id=_mother_id(db_session), is_active=False)
    )
    db_session.flush()
    assert client.get("/stats/public").json()["active_churches"] == before


def test_only_active_members_are_counted(client, db_session):
    church_id = _mother_id(db_session)
    before = client.get("/stats/public").json()["active_members"]
    _add_member(db_session, church_id, "actif@s.com", MemberStatus.active)
    _add_member(db_session, church_id, "attente@s.com", MemberStatus.pending)
    _add_member(db_session, church_id, "inactif@s.com", MemberStatus.inactive)
    assert client.get("/stats/public").json()["active_members"] == before + 1
