from sqlalchemy import select

from app.models.church import Church


BASE = "/api/donations"


# ── fixtures / helpers ────────────────────────────────────────────────────────


def _payload(church_id: int) -> dict:
    return {
        "amount": 50.0,
        "currency": "CAD",
        "category": "soutien_spirituel",
        "church_id": church_id,
    }


# ── POST /api/donations/ ──────────────────────────────────────────────────────


def test_create_donation_requires_auth(client, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    r = client.post(f"{BASE}/", json=_payload(church_id))
    assert r.status_code == 401


def test_create_donation_success(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("donor@b.com", church_id)
    r = client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("donor@b.com")
    )
    assert r.status_code == 201
    body = r.json()
    assert body["amount"] == 50.0
    assert body["currency"] == "CAD"
    assert body["receipt_number"].startswith("REC-")


def test_create_donation_unknown_church(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("donor2@b.com", church_id)
    r = client.post(
        f"{BASE}/",
        json=_payload(999999),
        headers=auth_header("donor2@b.com"),
    )
    assert r.status_code == 404


def test_create_donation_zero_amount(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("donor3@b.com", church_id)
    payload = _payload(church_id)
    payload["amount"] = 0
    r = client.post(f"{BASE}/", json=payload, headers=auth_header("donor3@b.com"))
    assert r.status_code == 422


# ── GET /api/donations/me ─────────────────────────────────────────────────────


def test_list_my_donations(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("me@b.com", church_id)
    h = auth_header("me@b.com")
    client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    client.post(f"{BASE}/", json=_payload(church_id), headers=h)
    r = client.get(f"{BASE}/me", headers=h)
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_list_my_donations_requires_auth(client):
    assert client.get(f"{BASE}/me").status_code == 401


# ── GET /api/donations/{id} ───────────────────────────────────────────────────


def test_get_donation(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("getdon@b.com", church_id)
    h = auth_header("getdon@b.com")
    donation_id = client.post(f"{BASE}/", json=_payload(church_id), headers=h).json()[
        "id"
    ]
    r = client.get(f"{BASE}/{donation_id}", headers=h)
    assert r.status_code == 200
    assert r.json()["id"] == donation_id


def test_get_donation_other_member_forbidden(
    client, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("owner@b.com", church_id)
    make_member("intruder@b.com", church_id)
    donation_id = client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("owner@b.com")
    ).json()["id"]
    r = client.get(f"{BASE}/{donation_id}", headers=auth_header("intruder@b.com"))
    assert r.status_code == 403


def test_get_donation_not_found(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("nfdon@b.com", church_id)
    r = client.get(f"{BASE}/999999", headers=auth_header("nfdon@b.com"))
    assert r.status_code == 404


# ── GET /api/donations/{id}/recu ──────────────────────────────────────────────


def test_get_receipt(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("recu@b.com", church_id)
    h = auth_header("recu@b.com")
    donation_id = client.post(f"{BASE}/", json=_payload(church_id), headers=h).json()[
        "id"
    ]
    r = client.get(f"{BASE}/{donation_id}/recu", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "receipt_number" in body
    assert body["amount"] == 50.0
    assert body["donor_email"] == "recu@b.com"


# ── GET /api/donations/ (admin) ───────────────────────────────────────────────


def test_list_all_requires_admin(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("plain2@b.com", church_id)
    r = client.get(f"{BASE}/", headers=auth_header("plain2@b.com"))
    assert r.status_code == 403


def test_admin_can_list_all_donations(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_user("admin@b.com", roles=["admin"])
    make_member("donor4@b.com", church_id)
    client.post(
        f"{BASE}/", json=_payload(church_id), headers=auth_header("donor4@b.com")
    )
    r = client.get(f"{BASE}/", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    assert len(r.json()) >= 1
