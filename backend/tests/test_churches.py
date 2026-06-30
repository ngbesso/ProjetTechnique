from sqlalchemy import select

from app.models.church import Church
from app.models.member import Member, MemberStatus
from app.models.rbac import Role, UserRole


# ── helpers ───────────────────────────────────────────────────────────────────

def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _create_affiliate(client, header, name, district="Centre") -> int:
    return client.post(
        "/churches", json={"name": name, "district": district}, headers=header
    ).json()["id"]


# ── list / get ────────────────────────────────────────────────────────────────

def test_list_is_public(client):
    r = client.get("/churches")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_contains_mother(client, db_session):
    r = client.get("/churches")
    ids = [c["id"] for c in r.json()]
    assert _mother_id(db_session) in ids


def test_get_church_by_id(client, db_session):
    church_id = _mother_id(db_session)
    r = client.get(f"/churches/{church_id}")
    assert r.status_code == 200
    assert r.json()["id"] == church_id


def test_get_church_not_found(client):
    r = client.get("/churches/999999")
    assert r.status_code == 404


# ── create ────────────────────────────────────────────────────────────────────

def test_create_requires_auth(client):
    r = client.post("/churches", json={"name": "Anon", "district": "Ouest"})
    assert r.status_code == 401


def test_member_cannot_create(client, make_user, auth_header):
    make_user("m@b.com", roles=["membre"])
    r = client.post(
        "/churches",
        json={"name": "Affiliée X", "district": "Ouest"},
        headers=auth_header("m@b.com"),
    )
    assert r.status_code == 403


def test_mother_admin_creates_affiliate(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    r = client.post(
        "/churches",
        json={"name": "Église de l'Ouest", "district": "Ouest"},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["is_mother"] is False
    assert body["parent_id"] == _mother_id(db_session)


def test_affiliate_admin_cannot_create(client, make_user, auth_header, db_session):
    """Un admin scopé à une affiliée ne peut pas créer de nouvelles églises (permission globale)."""
    make_user("boss@b.com", roles=["admin"])
    aff = _create_affiliate(client, auth_header("boss@b.com"), "Affiliée Y", "Est")
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=aff))
    db_session.flush()
    r = client.post(
        "/churches",
        json={"name": "Affiliée Z", "district": "Sud"},
        headers=auth_header("chef@b.com"),
    )
    assert r.status_code == 403


# ── update ────────────────────────────────────────────────────────────────────

def test_update_church(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    church_id = _create_affiliate(client, h, "Avant mise à jour", "Nord")
    r = client.patch(
        f"/churches/{church_id}",
        json={"name": "Après mise à jour"},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Après mise à jour"


def test_update_requires_auth(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    church_id = _create_affiliate(client, auth_header("admin@b.com"), "Test", "Centre")
    r = client.patch(f"/churches/{church_id}", json={"name": "Pirate"})
    assert r.status_code == 401


def test_update_church_not_found(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.patch("/churches/999999", json={"name": "Ghost"}, headers=auth_header("admin@b.com"))
    assert r.status_code == 404


# ── delete ────────────────────────────────────────────────────────────────────

def test_cannot_delete_mother(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    r = client.delete(f"/churches/{_mother_id(db_session)}", headers=auth_header("admin@b.com"))
    assert r.status_code == 409


def test_delete_affiliate_success(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    church_id = _create_affiliate(client, h, "À supprimer", "Outremer")
    r = client.delete(f"/churches/{church_id}", headers=h)
    assert r.status_code == 204
    assert client.get(f"/churches/{church_id}").status_code == 404


def test_delete_church_with_members_fails(client, make_user, auth_header, db_session):
    """Une affiliée ayant des membres ne peut pas être supprimée."""
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    church_id = _create_affiliate(client, h, "Avec membres", "Est")
    db_session.add(
        Member(
            church_id=church_id,
            first_name="Jean",
            last_name="Test",
            email="jean@b.com",
            status=MemberStatus.active,
        )
    )
    db_session.flush()
    r = client.delete(f"/churches/{church_id}", headers=h)
    assert r.status_code == 409
