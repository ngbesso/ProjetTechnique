"""Tests pour GET /settings, PUT /settings/{key} et intégration auto-approve."""

import re
from datetime import date

from sqlalchemy import select

from app.models.church import Church
from app.models.rbac import Role


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _request_membership(client, church_id, email, first="Test", last="User"):
    return client.post(
        "/members/request",
        json={
            "church_id": church_id,
            "first_name": first,
            "last_name": last,
            "email": email,
            "sexe": "Masculin",
        },
    )


# ── GET /settings ─────────────────────────────────────────────────────────────


def test_list_settings_requires_auth(client):
    assert client.get("/settings").status_code == 401


def test_list_settings_requires_global_admin(client, make_user, auth_header):
    make_user("membre@s.com", roles=["membre"])
    r = client.get("/settings", headers=auth_header("membre@s.com"))
    assert r.status_code == 403


def test_admin_can_list_settings(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    r = client.get("/settings", headers=auth_header("admin@s.com"))
    assert r.status_code == 200
    keys = [s["key"] for s in r.json()]
    assert "auto_approve_members" in keys


def test_settings_manage_permission_is_enough(client, make_user, auth_header, db_session):
    """La permission dédiée settings:manage donne accès aux réglages, sans
    ouvrir le reste de l'administration."""
    make_user("admin@s.com", roles=["admin"])
    h_admin = auth_header("admin@s.com")
    client.post("/admin/roles", json={"name": "gestionnaire_reglages"}, headers=h_admin)
    role = db_session.scalar(select(Role).where(Role.name == "gestionnaire_reglages"))
    client.put(
        f"/admin/roles/{role.id}/permissions",
        json={"codes": ["settings:manage"]},
        headers=h_admin,
    )
    make_user("reglages@s.com", roles=["gestionnaire_reglages"])
    h = auth_header("reglages@s.com")

    assert client.get("/settings", headers=h).status_code == 200
    r = client.put("/settings/site_name", json={"value": "Nouveau nom"}, headers=h)
    assert r.status_code == 200
    assert client.get("/admin/roles", headers=h).status_code == 403


def test_settings_response_shape(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    r = client.get("/settings", headers=auth_header("admin@s.com"))
    setting = next(s for s in r.json() if s["key"] == "auto_approve_members")
    assert "key" in setting
    assert "value" in setting
    assert "description" in setting
    assert setting["description"]  # non vide


def test_auto_approve_members_default_is_false(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    r = client.get("/settings", headers=auth_header("admin@s.com"))
    setting = next(s for s in r.json() if s["key"] == "auto_approve_members")
    assert setting["value"] == "false"


# ── PUT /settings/{key} ───────────────────────────────────────────────────────


def test_update_setting_requires_auth(client):
    r = client.put("/settings/auto_approve_members", json={"value": "true"})
    assert r.status_code == 401


def test_update_setting_requires_global_admin(client, make_user, auth_header):
    make_user("membre@s.com", roles=["membre"])
    r = client.put(
        "/settings/auto_approve_members",
        json={"value": "true"},
        headers=auth_header("membre@s.com"),
    )
    assert r.status_code == 403


def test_admin_can_update_setting(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    r = client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    assert r.status_code == 200
    assert r.json()["value"] == "true"


def test_update_setting_reflected_in_list(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    settings = client.get("/settings", headers=h).json()
    setting = next(s for s in settings if s["key"] == "auto_approve_members")
    assert setting["value"] == "true"


def test_update_setting_toggles_value(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    r = client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)
    assert r.status_code == 200
    assert r.json()["value"] == "false"


def test_update_unknown_key_rejected(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    r = client.put(
        "/settings/unknown_key",
        json={"value": "x"},
        headers=auth_header("admin@s.com"),
    )
    assert r.status_code == 400


def test_update_setting_returns_description(client, make_user, auth_header):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    r = client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    assert r.json()["description"]


# ── Intégration auto-approve ──────────────────────────────────────────────────


def test_auto_approve_disabled_member_stays_pending(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    # S'assurer que le flag est désactivé (valeur par défaut du seed)
    client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)

    r = _request_membership(
        client, _mother_id(db_session), "paulo@s.com", "Paulo", "Pending"
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending"
    assert body["member_code"] is None


def test_auto_approve_enabled_member_becomes_active_with_code(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)

    r = _request_membership(
        client, _mother_id(db_session), "auto@s.com", "Auto", "Approved"
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "active"
    assert body["member_code"] is not None
    assert re.match(rf"MBR-{date.today().year}-\d{{4}}", body["member_code"])


def test_auto_approve_enabled_sends_email(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)

    _request_membership(client, _mother_id(db_session), "mail@s.com", "Mail", "Test")
    assert fake_email.sent
    assert fake_email.sent[0][0] == "mail@s.com"


def test_auto_approve_disabled_sends_received_email(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)

    _request_membership(client, _mother_id(db_session), "rcv@s.com", "Rcv", "Test")
    assert fake_email.sent
    assert fake_email.sent[0][0] == "rcv@s.com"


def test_enabling_auto_approve_activates_existing_pending_members(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)
    r1 = _request_membership(client, _mother_id(db_session), "stock1@s.com", "Stock", "Un")
    r2 = _request_membership(client, _mother_id(db_session), "stock2@s.com", "Stock", "Deux")
    assert r1.json()["status"] == "pending"
    assert r2.json()["status"] == "pending"

    r = client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    assert r.status_code == 200

    m1 = client.get(f"/members/{r1.json()['id']}", headers=h).json()
    m2 = client.get(f"/members/{r2.json()['id']}", headers=h).json()
    assert m1["status"] == "active"
    assert m1["member_code"] is not None
    assert m2["status"] == "active"
    assert m2["member_code"] is not None


def test_enabling_auto_approve_does_not_touch_rejected_members(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)
    rejected = _request_membership(client, _mother_id(db_session), "rej2@s.com", "Re", "Jete")
    mid = rejected.json()["id"]
    client.post(f"/members/{mid}/reject", headers=h)

    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)

    m = client.get(f"/members/{mid}", headers=h).json()
    assert m["status"] == "rejected"
    assert m["member_code"] is None


def test_enabling_auto_approve_when_already_true_is_a_noop(
    client, fake_email, make_user, auth_header
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    r = client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)
    assert r.status_code == 200


def test_disabling_auto_approve_does_not_activate_pending_members(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)
    r1 = _request_membership(client, _mother_id(db_session), "stay@s.com", "Stay", "Pending")

    client.put("/settings/auto_approve_members", json={"value": "false"}, headers=h)

    m = client.get(f"/members/{r1.json()['id']}", headers=h).json()
    assert m["status"] == "pending"


def test_auto_approve_multiple_requests_get_sequential_codes(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@s.com", roles=["admin"])
    h = auth_header("admin@s.com")
    client.put("/settings/auto_approve_members", json={"value": "true"}, headers=h)

    r1 = _request_membership(client, _mother_id(db_session), "m1@s.com", "M1", "T")
    r2 = _request_membership(client, _mother_id(db_session), "m2@s.com", "M2", "T")
    code1 = r1.json()["member_code"]
    code2 = r2.json()["member_code"]
    n1 = int(code1.split("-")[-1])
    n2 = int(code2.split("-")[-1])
    assert n2 == n1 + 1
