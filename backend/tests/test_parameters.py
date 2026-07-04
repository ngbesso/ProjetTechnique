"""Tests pour GET/POST /parameters/{category} et PATCH/DELETE /parameters/{id}."""
import pytest
from sqlalchemy import select

from app.models.church import Church


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


# ── GET /parameters/{category} — public ──────────────────────────────────────


def test_list_sexe_is_public(client):
    r = client.get("/parameters/sexe")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_family_status_is_public(client):
    r = client.get("/parameters/family_status")
    assert r.status_code == 200


def test_list_district_is_public(client):
    r = client.get("/parameters/district")
    assert r.status_code == 200


def test_list_sexe_contains_seeded_values(client):
    labels = [v["label"] for v in client.get("/parameters/sexe").json()]
    assert "Masculin" in labels
    assert "Féminin" in labels
    assert "Autre" in labels


def test_list_family_status_contains_seeded_values(client):
    labels = [v["label"] for v in client.get("/parameters/family_status").json()]
    assert "Célibataire" in labels
    assert "Marié(e)" in labels


def test_list_district_contains_seeded_values(client):
    labels = [v["label"] for v in client.get("/parameters/district").json()]
    assert "Ouest" in labels
    assert "Est" in labels


def test_list_unknown_category_rejected(client):
    r = client.get("/parameters/foo")
    assert r.status_code == 400


def test_list_response_shape(client):
    items = client.get("/parameters/sexe").json()
    assert len(items) > 0
    first = items[0]
    assert {"id", "category", "label", "position"} <= first.keys()
    assert first["category"] == "sexe"


# ── POST /parameters/{category} — admin requis ────────────────────────────────


def test_create_requires_auth(client):
    r = client.post("/parameters/sexe", json={"label": "Non-binaire"})
    assert r.status_code == 401


def test_create_requires_global_admin(client, make_user, auth_header):
    make_user("membre@p.com", roles=["membre"])
    r = client.post(
        "/parameters/sexe",
        json={"label": "Non-binaire"},
        headers=auth_header("membre@p.com"),
    )
    assert r.status_code == 403


def test_admin_creates_sexe_value(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    r = client.post(
        "/parameters/sexe",
        json={"label": "Non-binaire", "position": 10},
        headers=auth_header("admin@p.com"),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["label"] == "Non-binaire"
    assert body["category"] == "sexe"
    assert body["position"] == 10


def test_admin_creates_district_value(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    r = client.post(
        "/parameters/district",
        json={"label": "Nord"},
        headers=auth_header("admin@p.com"),
    )
    assert r.status_code == 201
    assert r.json()["label"] == "Nord"


def test_create_default_position_is_zero(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    r = client.post(
        "/parameters/sexe",
        json={"label": "AutreVal"},
        headers=auth_header("admin@p.com"),
    )
    assert r.status_code == 201
    assert r.json()["position"] == 0


def test_create_duplicate_rejected(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    h = auth_header("admin@p.com")
    client.post("/parameters/sexe", json={"label": "UniqVal"}, headers=h)
    r = client.post("/parameters/sexe", json={"label": "UniqVal"}, headers=h)
    assert r.status_code == 409


def test_create_unknown_category_rejected(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    r = client.post(
        "/parameters/foo",
        json={"label": "Test"},
        headers=auth_header("admin@p.com"),
    )
    assert r.status_code == 400


def test_created_value_appears_in_list(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    h = auth_header("admin@p.com")
    client.post("/parameters/sexe", json={"label": "Nouveau"}, headers=h)
    labels = [v["label"] for v in client.get("/parameters/sexe").json()]
    assert "Nouveau" in labels


# ── PATCH /parameters/{id} ────────────────────────────────────────────────────


def test_rename_parameter_value(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    h = auth_header("admin@p.com")
    pv_id = client.post("/parameters/district", json={"label": "TempDist"}, headers=h).json()["id"]
    r = client.patch(f"/parameters/{pv_id}", json={"label": "Renamed"}, headers=h)
    assert r.status_code == 200
    assert r.json()["label"] == "Renamed"


def test_reorder_parameter_value(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    h = auth_header("admin@p.com")
    pv_id = client.post("/parameters/district", json={"label": "DistA", "position": 99}, headers=h).json()["id"]
    r = client.patch(f"/parameters/{pv_id}", json={"position": 1}, headers=h)
    assert r.status_code == 200
    assert r.json()["position"] == 1


def test_patch_nonexistent_returns_404(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    r = client.patch(
        "/parameters/999999",
        json={"label": "X"},
        headers=auth_header("admin@p.com"),
    )
    assert r.status_code == 404


def test_rename_requires_global_admin(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    make_user("membre@p.com", roles=["membre"])
    h_admin = auth_header("admin@p.com")
    pv_id = client.post("/parameters/sexe", json={"label": "TmpForPatch"}, headers=h_admin).json()["id"]
    r = client.patch(
        f"/parameters/{pv_id}",
        json={"label": "ShouldFail"},
        headers=auth_header("membre@p.com"),
    )
    assert r.status_code == 403


# ── DELETE /parameters/{id} ───────────────────────────────────────────────────


def test_delete_parameter_value(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    h = auth_header("admin@p.com")
    pv_id = client.post("/parameters/sexe", json={"label": "ToDelete"}, headers=h).json()["id"]
    r = client.delete(f"/parameters/{pv_id}", headers=h)
    assert r.status_code == 204


def test_deleted_value_absent_from_list(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    h = auth_header("admin@p.com")
    pv_id = client.post("/parameters/sexe", json={"label": "WillDisappear"}, headers=h).json()["id"]
    client.delete(f"/parameters/{pv_id}", headers=h)
    labels = [v["label"] for v in client.get("/parameters/sexe").json()]
    assert "WillDisappear" not in labels


def test_delete_nonexistent_returns_404(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    r = client.delete("/parameters/999999", headers=auth_header("admin@p.com"))
    assert r.status_code == 404


def test_delete_requires_global_admin(client, make_user, auth_header):
    make_user("admin@p.com", roles=["admin"])
    make_user("membre@p.com", roles=["membre"])
    h_admin = auth_header("admin@p.com")
    pv_id = client.post("/parameters/sexe", json={"label": "ForDelTest"}, headers=h_admin).json()["id"]
    r = client.delete(f"/parameters/{pv_id}", headers=auth_header("membre@p.com"))
    assert r.status_code == 403
