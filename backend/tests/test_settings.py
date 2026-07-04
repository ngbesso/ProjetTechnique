"""Tests pour GET /settings, PUT /settings/{key} et intégration auto-approve."""
import re
from datetime import date

import pytest
from sqlalchemy import select

from app.models.church import Church


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _request_membership(client, church_id, email, first="Test", last="User"):
    return client.post(
        "/members/request",
        json={"church_id": church_id, "first_name": first, "last_name": last, "email": email},
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

    r = _request_membership(client, _mother_id(db_session), "paulo@s.com", "Paulo", "Pending")
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

    r = _request_membership(client, _mother_id(db_session), "auto@s.com", "Auto", "Approved")
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
