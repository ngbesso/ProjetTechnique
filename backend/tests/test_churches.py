from sqlalchemy import select

from app.models.church import Church
from app.models.rbac import Role, UserRole


def test_list_is_public(client):
    assert client.get("/churches").status_code == 200


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
    mother = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    assert body["parent_id"] == mother.id


def test_cannot_delete_mother(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    mother = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    r = client.delete(f"/churches/{mother.id}", headers=auth_header("admin@b.com"))
    assert r.status_code == 409


def test_affiliate_admin_cannot_create(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    aff = client.post(
        "/churches",
        json={"name": "Affiliée Y", "district": "Est"},
        headers=auth_header("boss@b.com"),
    ).json()["id"]
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=aff))
    db_session.flush()
    r = client.post(
        "/churches",
        json={"name": "Affiliée Z", "district": "Sud"},
        headers=auth_header("chef@b.com"),
    )
    assert r.status_code == 403  # church:manage est global -> mère uniquement
