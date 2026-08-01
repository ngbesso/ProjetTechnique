from app.models.expense import Expense

BASE = "/expenses"


def _payload(**overrides):
    payload = {
        "amount": 100.0,
        "expense_date": "2026-07-01",
        "category": "Loyer et charges",
        "comment": "Loyer du mois de juillet.",
    }
    payload.update(overrides)
    return payload


def _admin_header(make_user, auth_header):
    make_user("admin_exp@test.com", roles=["admin"])
    return auth_header("admin_exp@test.com")


# ── Permissions ───────────────────────────────────────────────────────────────


def test_list_requires_auth(client):
    r = client.get(BASE)
    assert r.status_code == 401


def test_list_requires_finance_permission(client, make_user, auth_header):
    make_user("regular_exp@test.com")
    r = client.get(BASE, headers=auth_header("regular_exp@test.com"))
    assert r.status_code == 403


def test_create_requires_finance_permission(client, make_user, auth_header):
    make_user("creator_exp@test.com")
    r = client.post(BASE, json=_payload(), headers=auth_header("creator_exp@test.com"))
    assert r.status_code == 403


# ── Création ──────────────────────────────────────────────────────────────────


def test_create_expense_sets_responsible_from_current_user(
    client, make_user, auth_header
):
    h = _admin_header(make_user, auth_header)
    r = client.post(BASE, json=_payload(), headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["amount"] == 100.0
    assert body["category"] == "Loyer et charges"
    assert body["comment"] == "Loyer du mois de juillet."
    assert body["responsible_email"] == "admin_exp@test.com"


def test_create_expense_requires_comment(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    payload = _payload()
    payload["comment"] = ""
    r = client.post(BASE, json=payload, headers=h)
    assert r.status_code == 422


def test_create_expense_requires_positive_amount(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    payload = _payload(amount=0)
    r = client.post(BASE, json=payload, headers=h)
    assert r.status_code == 422


# ── Liste / filtres ───────────────────────────────────────────────────────────


def test_list_filters_by_category_and_date(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    client.post(
        BASE, json=_payload(category="Formation", expense_date="2026-01-10"), headers=h
    )
    client.post(
        BASE,
        json=_payload(category="Loyer et charges", expense_date="2026-07-01"),
        headers=h,
    )

    r = client.get(f"{BASE}?category=Formation", headers=h)
    assert r.status_code == 200
    titles = [e["category"] for e in r.json()["items"]]
    assert titles == ["Formation"]

    r = client.get(f"{BASE}?start=2026-06-01&end=2026-08-01", headers=h)
    dates = [e["expense_date"] for e in r.json()["items"]]
    assert "2026-07-01" in dates
    assert "2026-01-10" not in dates


# ── Modification / suppression ────────────────────────────────────────────────


def test_update_and_delete_expense(client, make_user, auth_header, db_session):
    h = _admin_header(make_user, auth_header)
    created = client.post(BASE, json=_payload(), headers=h).json()

    r = client.patch(f"{BASE}/{created['id']}", json={"amount": 250.0}, headers=h)
    assert r.status_code == 200
    assert r.json()["amount"] == 250.0

    r = client.delete(f"{BASE}/{created['id']}", headers=h)
    assert r.status_code == 204
    assert db_session.get(Expense, created["id"]) is None


def test_update_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/999999", json={"amount": 10.0}, headers=h)
    assert r.status_code == 404


# ── Catégories ────────────────────────────────────────────────────────────────


def test_list_categories(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    client.post(BASE, json=_payload(category="Formation"), headers=h)
    r = client.get(f"{BASE}/categories", headers=h)
    assert r.status_code == 200
    assert "Formation" in r.json()


# ── Pièce jointe justificative ─────────────────────────────────────────────────


def test_attachment_upload_download_delete(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    expense_id = client.post(BASE, json=_payload(), headers=h).json()["id"]

    r = client.get(f"{BASE}/{expense_id}/attachment", headers=h)
    assert r.status_code == 404

    r = client.post(
        f"{BASE}/{expense_id}/attachment",
        headers=h,
        files={"file": ("facture.txt", b"contenu de la facture", "text/plain")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["attachment_url"] == f"/expenses/{expense_id}/attachment"
    assert body["attachment_name"] == "facture.txt"

    r = client.get(f"{BASE}/{expense_id}/attachment", headers=h)
    assert r.status_code == 200
    assert r.content == b"contenu de la facture"

    r = client.delete(f"{BASE}/{expense_id}/attachment", headers=h)
    assert r.status_code == 204
    assert client.get(f"{BASE}/{expense_id}/attachment", headers=h).status_code == 404


def test_attachment_requires_finance_permission(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    expense_id = client.post(BASE, json=_payload(), headers=h).json()["id"]

    make_user("regular_exp_attach@test.com")
    r = client.post(
        f"{BASE}/{expense_id}/attachment",
        headers=auth_header("regular_exp_attach@test.com"),
        files={"file": ("facture.txt", b"x", "text/plain")},
    )
    assert r.status_code == 403
