from sqlalchemy import select

from app.models.rbac import Role


def test_member_forbidden_on_admin(client, make_user, auth_header):
    make_user("m@b.com", roles=["membre"])
    r = client.get("/admin/roles", headers=auth_header("m@b.com"))
    assert r.status_code == 403                    # un membre n'entre pas


def test_admin_allowed_on_admin(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.get("/admin/roles", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    names = [role["name"] for role in r.json()]
    assert "admin" in names and "membre" in names


def test_admin_can_recompose_role(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    membre = db_session.scalar(select(Role).where(Role.name == "membre"))
    r = client.put(
        f"/admin/roles/{membre.id}/permissions",
        json={"codes": ["sermon:read"]},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 200
    assert r.json()["permissions"] == ["sermon:read"]