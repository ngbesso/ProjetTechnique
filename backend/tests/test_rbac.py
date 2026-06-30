from sqlalchemy import select

from app.models.rbac import Role


# ── /admin/permissions ────────────────────────────────────────────────────────


def test_list_permissions_requires_auth(client):
    assert client.get("/admin/permissions").status_code == 401


def test_member_cannot_list_permissions(client, make_user, auth_header):
    make_user("m@b.com", roles=["membre"])
    assert (
        client.get("/admin/permissions", headers=auth_header("m@b.com")).status_code
        == 403
    )


def test_admin_can_list_permissions(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.get("/admin/permissions", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    codes = [p["code"] for p in r.json()]
    assert "member:read" in codes and "member:approve" in codes


# ── /admin/roles ──────────────────────────────────────────────────────────────


def test_member_forbidden_on_admin(client, make_user, auth_header):
    make_user("m@b.com", roles=["membre"])
    assert client.get("/admin/roles", headers=auth_header("m@b.com")).status_code == 403


def test_admin_allowed_on_admin(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.get("/admin/roles", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    names = [role["name"] for role in r.json()]
    assert "admin" in names and "membre" in names


def test_create_role(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.post(
        "/admin/roles",
        json={"name": "moderateur", "description": "Modérateur de contenu"},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 201
    assert r.json()["name"] == "moderateur"


def test_create_role_duplicate(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    client.post("/admin/roles", json={"name": "unique_role"}, headers=h)
    r = client.post("/admin/roles", json={"name": "unique_role"}, headers=h)
    assert r.status_code == 409


# ── /admin/roles/{id}/permissions ─────────────────────────────────────────────


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


def test_set_permissions_unknown_role(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.put(
        "/admin/roles/999999/permissions",
        json={"codes": []},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 404


def test_set_permissions_ignores_unknown_codes(
    client, make_user, auth_header, db_session
):
    """Les codes de permission inconnus sont silencieusement ignorés."""
    make_user("admin@b.com", roles=["admin"])
    membre = db_session.scalar(select(Role).where(Role.name == "membre"))
    r = client.put(
        f"/admin/roles/{membre.id}/permissions",
        json={"codes": ["sermon:read", "fake:perm"]},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 200
    assert "fake:perm" not in r.json()["permissions"]
