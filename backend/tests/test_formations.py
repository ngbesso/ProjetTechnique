from datetime import date, timedelta

from sqlalchemy import select

from app.models.church import Church
from app.models.formation import Formation, FormationStatus


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _make_formation(db_session, **overrides) -> Formation:
    defaults = dict(
        title="Formation Test",
        instructor="Formateur X",
        formation_date=date.today() + timedelta(days=10),
        price=25.0,
        capacity=10,
        status=FormationStatus.published,
    )
    defaults.update(overrides)
    formation = Formation(**defaults)
    db_session.add(formation)
    db_session.flush()
    return formation


def _register(client, formation_id, email, first="Jean", last="Test"):
    return client.post(
        f"/formations/{formation_id}/register",
        json={"first_name": first, "last_name": last, "email": email},
    )


# ── GET /formations/registrations/me ──────────────────────────────────────────


def test_my_registrations_requires_auth(client):
    assert client.get("/formations/registrations/me").status_code == 401


def test_my_registrations_empty_when_none(client, make_member, auth_header, db_session):
    make_member("noregs@b.com", _mother_id(db_session))
    r = client.get(
        "/formations/registrations/me", headers=auth_header("noregs@b.com")
    )
    assert r.status_code == 200
    assert r.json() == []


def test_my_registrations_returns_own_with_formation_details(
    client, make_member, auth_header, db_session
):
    member = make_member("hasreg@b.com", _mother_id(db_session))
    formation = _make_formation(db_session)
    reg = _register(client, formation.id, member.email)
    assert reg.status_code == 201

    r = client.get(
        "/formations/registrations/me", headers=auth_header("hasreg@b.com")
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["formation_id"] == formation.id
    assert body[0]["formation"]["title"] == "Formation Test"
    assert body[0]["formation"]["instructor"] == "Formateur X"
    assert body[0]["formation"]["price"] == 25.0


def test_my_registrations_isolated_between_members(
    client, make_member, auth_header, db_session
):
    """Un membre ne doit jamais voir les inscriptions d'un autre membre."""
    church_id = _mother_id(db_session)
    member_a = make_member("regA@b.com", church_id)
    make_member("regB@b.com", church_id)
    formation = _make_formation(db_session)
    _register(client, formation.id, member_a.email)

    r_a = client.get("/formations/registrations/me", headers=auth_header("regA@b.com"))
    r_b = client.get("/formations/registrations/me", headers=auth_header("regB@b.com"))
    assert len(r_a.json()) == 1
    assert len(r_b.json()) == 0
