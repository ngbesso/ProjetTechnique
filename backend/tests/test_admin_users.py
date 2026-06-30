from sqlalchemy import select

from app.models.church import Church
from app.models.rbac import Role


# ── GET /admin/users ──────────────────────────────────────────────────────────

def test_list_users_requires_auth(client):
    assert client.get("/admin/users").status_code == 401


def test_member_cannot_list_users(client, make_user, auth_header):
    make_user("m@b.com", roles=["membre"])
    assert client.get("/admin/users", headers=auth_header("m@b.com")).status_code == 403


def test_admin_can_list_users(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    make_user("other@b.com", roles=["membre"])
    r = client.get("/admin/users", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    emails = [u["email"] for u in r.json()]
    assert "admin@b.com" in emails
    assert "other@b.com" in emails


def test_list_users_contains_assignments(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.get("/admin/users", headers=auth_header("admin@b.com"))
    admin_record = next(u for u in r.json() if u["email"] == "admin@b.com")
    assert len(admin_record["assignments"]) >= 1


# ── PATCH /admin/users/{id} ───────────────────────────────────────────────────

def test_deactivate_user(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    target = make_user("target@b.com")
    r = client.patch(
        f"/admin/users/{target.id}",
        json={"is_active": False},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_activate_user(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    target = make_user("sleeping@b.com")
    target.is_active = False
    db_session.flush()
    r = client.patch(
        f"/admin/users/{target.id}",
        json={"is_active": True},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is True


def test_patch_user_not_found(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.patch("/admin/users/999999", json={"is_active": False}, headers=auth_header("admin@b.com"))
    assert r.status_code == 404


# ── POST /admin/role-assignments ──────────────────────────────────────────────

def test_assign_role(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    target = make_user("future@b.com")
    role = db_session.scalar(select(Role).where(Role.name == "membre"))
    church = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    r = client.post(
        "/admin/role-assignments",
        json={"user_id": target.id, "role_id": role.id, "church_id": church.id},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 201
    assert r.json()["status"] == "ok"


def test_assign_role_duplicate(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    target = make_user("dup@b.com")
    role = db_session.scalar(select(Role).where(Role.name == "membre"))
    church = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    payload = {"user_id": target.id, "role_id": role.id, "church_id": church.id}
    h = auth_header("admin@b.com")
    client.post("/admin/role-assignments", json=payload, headers=h)
    r = client.post("/admin/role-assignments", json=payload, headers=h)
    assert r.status_code == 409


def test_assign_role_unknown_user(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    role = db_session.scalar(select(Role).where(Role.name == "membre"))
    church = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    r = client.post(
        "/admin/role-assignments",
        json={"user_id": 999999, "role_id": role.id, "church_id": church.id},
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 404


# ── DELETE /admin/role-assignments ────────────────────────────────────────────

def test_revoke_role(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    target = make_user("revoke@b.com", roles=["membre"])
    role = db_session.scalar(select(Role).where(Role.name == "membre"))
    church = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    h = auth_header("admin@b.com")
    r = client.delete(
        f"/admin/role-assignments?user_id={target.id}&role_id={role.id}&church_id={church.id}",
        headers=h,
    )
    assert r.status_code == 204


def test_revoke_nonexistent_assignment_is_idempotent(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    role = db_session.scalar(select(Role).where(Role.name == "membre"))
    church = db_session.scalar(select(Church).where(Church.parent_id.is_(None)))
    r = client.delete(
        f"/admin/role-assignments?user_id=999999&role_id={role.id}&church_id={church.id}",
        headers=auth_header("admin@b.com"),
    )
    assert r.status_code == 204
