import re
from datetime import date


from sqlalchemy import select

from app.models.church import Church
from app.models.rbac import Role, UserRole
from app.models.user import User


# ── helpers ───────────────────────────────────────────────────────────────────


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _affiliate(client, header, name, district="Est") -> int:
    return client.post(
        "/churches", json={"name": name, "district": district}, headers=header
    ).json()["id"]


def _request(client, church_id, email="a@b.com", first="Alice", last="Test", **extra):
    payload = {
        "church_id": church_id,
        "first_name": first,
        "last_name": last,
        "email": email,
        **extra,
    }
    return client.post("/members/request", json=payload)


# ── POST /members/request — champs de base ────────────────────────────────────


def test_request_creates_pending_and_emails(client, fake_email, db_session):
    r = _request(client, _mother_id(db_session), "marie@b.com", "Marie", "Koffi")
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    assert fake_email.sent and fake_email.sent[0][0] == "marie@b.com"


def test_request_unknown_church(client, fake_email):
    r = client.post(
        "/members/request",
        json={
            "church_id": 999999,
            "first_name": "X",
            "last_name": "Y",
            "email": "x@b.com",
        },
    )
    assert r.status_code == 404


def test_request_invalid_email(client, db_session):
    r = _request(client, _mother_id(db_session), email="not-an-email")
    assert r.status_code == 422


# ── POST /members/request — nouveaux champs sexe / telephone ──────────────────


def test_request_with_sexe_and_telephone(client, fake_email, db_session):
    r = _request(
        client,
        _mother_id(db_session),
        email="ali@b.com",
        first="Ali",
        last="Baba",
        sexe="Masculin",
        telephone="+1 514 555-9999",
    )
    assert r.status_code == 201
    body = r.json()
    assert body["sexe"] == "Masculin"
    assert body["telephone"] == "+1 514 555-9999"


def test_request_pending_has_no_member_code(client, fake_email, db_session):
    r = _request(client, _mother_id(db_session), "pend@b.com")
    assert r.status_code == 201
    assert r.json()["member_code"] is None


# ── Validation date_naissance ─────────────────────────────────────────────────


def test_request_birth_date_future_rejected(client, db_session):
    from datetime import timedelta

    future = (date.today() + timedelta(days=1)).isoformat()
    r = _request(client, _mother_id(db_session), "bd@b.com", birth_date=future)
    assert r.status_code == 422


def test_request_birth_date_today_accepted(client, fake_email, db_session):
    r = _request(
        client,
        _mother_id(db_session),
        "born@b.com",
        birth_date=date.today().isoformat(),
    )
    assert r.status_code == 201


def test_request_birth_date_past_accepted(client, fake_email, db_session):
    r = _request(client, _mother_id(db_session), "past@b.com", birth_date="1990-06-15")
    assert r.status_code == 201


# ── Validation telephone ──────────────────────────────────────────────────────


def test_request_telephone_too_short_rejected(client, db_session):
    r = _request(client, _mother_id(db_session), "short@b.com", telephone="12345")
    assert r.status_code == 422


def test_request_telephone_exactly_6_digits_rejected(client, db_session):
    r = _request(client, _mother_id(db_session), "six@b.com", telephone="123456")
    assert r.status_code == 422


def test_request_telephone_7_digits_accepted(client, fake_email, db_session):
    r = _request(client, _mother_id(db_session), "tel7@b.com", telephone="1234567")
    assert r.status_code == 201


def test_request_telephone_formatted_accepted(client, fake_email, db_session):
    r = _request(
        client, _mother_id(db_session), "telfmt@b.com", telephone="+1 (514) 555-0101"
    )
    assert r.status_code == 201


# ── GET /members ──────────────────────────────────────────────────────────────


def test_list_requires_auth(client):
    assert client.get("/members").status_code == 401


def test_plain_member_cannot_list(client, make_user, auth_header):
    make_user("plain@b.com", roles=["membre"])
    assert client.get("/members", headers=auth_header("plain@b.com")).status_code == 403


def test_admin_can_list_members(client, fake_email, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    _request(client, _mother_id(db_session))
    r = client.get("/members", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_list_with_status_filter(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    _request(client, _mother_id(db_session), email="f@b.com")
    h = auth_header("admin@b.com")
    r_pending = client.get("/members?status=pending", headers=h)
    assert r_pending.status_code == 200
    assert all(m["status"] == "pending" for m in r_pending.json()["items"])


def test_affiliate_admin_sees_only_own(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Ouest")
    b = _affiliate(client, h, "B", "Est")
    _request(client, a, "al@b.com", "Al", "A")
    _request(client, b, "bo@b.com", "Bo", "B")
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    items = client.get("/members", headers=auth_header("chef@b.com")).json()["items"]
    assert {m["church_id"] for m in items} == {a}


# ── GET /members/admin/stats ──────────────────────────────────────────────────


def test_stats_requires_auth(client):
    assert client.get("/members/admin/stats").status_code == 401


def test_stats_counts_by_status(client, fake_email, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mother = _mother_id(db_session)
    _request(client, mother, "s1@b.com", "S", "1")
    m2 = _request(client, mother, "s2@b.com", "S", "2").json()["id"]
    m3 = _request(client, mother, "s3@b.com", "S", "3").json()["id"]
    m4 = _request(client, mother, "s4@b.com", "S", "4").json()["id"]
    client.post(f"/members/{m2}/approve", headers=h)
    client.post(f"/members/{m3}/approve", headers=h)
    client.post(f"/members/{m3}/deactivate", headers=h)
    client.post(f"/members/{m4}/reject", headers=h)

    r = client.get("/members/admin/stats", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["pending"] == 1
    assert body["active"] == 1
    assert body["inactive"] == 1
    assert body["rejected"] == 1


def test_stats_scoped_to_affiliate_admin(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Ouest")
    b = _affiliate(client, h, "B", "Est")
    _request(client, a, "al@b.com", "Al", "A")
    _request(client, b, "bo@b.com", "Bo", "B")
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    r = client.get("/members/admin/stats", headers=auth_header("chef@b.com"))
    assert r.status_code == 200
    assert r.json()["pending"] == 1


# ── GET /members/{id} ─────────────────────────────────────────────────────────


def test_get_member_by_admin(client, fake_email, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    member_id = _request(client, _mother_id(db_session), "g@b.com").json()["id"]
    r = client.get(f"/members/{member_id}", headers=auth_header("admin@b.com"))
    assert r.status_code == 200
    assert r.json()["id"] == member_id


def test_get_member_not_found(client, make_user, auth_header):
    make_user("admin@b.com", roles=["admin"])
    r = client.get("/members/999999", headers=auth_header("admin@b.com"))
    assert r.status_code == 404


def test_get_member_outside_scope(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Ouest")
    b = _affiliate(client, h, "B", "Sud")
    member_id = _request(client, b, "z@b.com", "Z", "Z").json()["id"]
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    r = client.get(f"/members/{member_id}", headers=auth_header("chef@b.com"))
    assert r.status_code == 403


# ── PATCH /members/{id} ───────────────────────────────────────────────────────


def test_update_member(client, fake_email, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member_id = _request(client, _mother_id(db_session), "upd@b.com").json()["id"]
    r = client.patch(
        f"/members/{member_id}",
        json={"first_name": "Nouveau", "address": "12 rue des Lilas"},
        headers=h,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["first_name"] == "Nouveau"
    assert body["address"] == "12 rue des Lilas"


def test_update_member_birth_date_future_rejected(
    client, fake_email, make_user, auth_header, db_session
):
    from datetime import timedelta

    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "upd2@b.com").json()["id"]
    future = (date.today() + timedelta(days=1)).isoformat()
    r = client.patch(f"/members/{mid}", json={"birth_date": future}, headers=h)
    assert r.status_code == 422


# ── POST /members/{id}/approve — code membre ──────────────────────────────────


def test_approve_creates_user_and_sends_invite(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member_id = _request(
        client, _mother_id(db_session), "new@b.com", "Novo", "User"
    ).json()["id"]
    r = client.post(f"/members/{member_id}/approve", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "active"
    assert db_session.scalar(select(User).where(User.email == "new@b.com")) is not None
    assert fake_email.sent


def test_request_with_existing_user_email_rejected(
    client, fake_email, make_user, db_session
):
    """L'email d'un compte User existant ne peut pas servir à une nouvelle demande
    (contrôle anti-doublon avec message générique anti-énumération)."""
    make_user("existing@b.com")
    r = _request(client, _mother_id(db_session), "existing@b.com", "Ex", "Isting")
    assert r.status_code == 409
    assert not fake_email.sent


def test_approve_assigns_member_code(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "code@b.com").json()["id"]
    r = client.post(f"/members/{mid}/approve", headers=h)
    assert r.status_code == 200
    code = r.json()["member_code"]
    assert code is not None
    assert re.match(rf"MBR-{date.today().year}-\d{{4}}", code)


def test_approve_sequential_member_codes(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid1 = _request(client, _mother_id(db_session), "seq1@b.com").json()["id"]
    mid2 = _request(client, _mother_id(db_session), "seq2@b.com").json()["id"]
    code1 = client.post(f"/members/{mid1}/approve", headers=h).json()["member_code"]
    code2 = client.post(f"/members/{mid2}/approve", headers=h).json()["member_code"]
    n1 = int(code1.split("-")[-1])
    n2 = int(code2.split("-")[-1])
    assert n2 == n1 + 1


def test_cannot_approve_outside_scope(
    client, fake_email, make_user, auth_header, db_session
):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "A", "Ouest")
    b = _affiliate(client, h, "B", "Est")
    mid = _request(client, b, "bo@b.com", "Bo", "B").json()["id"]
    chef = make_user("chef@b.com")
    admin = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin.id, church_id=a))
    db_session.flush()
    r = client.post(f"/members/{mid}/approve", headers=auth_header("chef@b.com"))
    assert r.status_code == 403


# ── POST /members/{id}/reject ─────────────────────────────────────────────────


def test_reject_member(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "rej@b.com").json()["id"]
    r = client.post(f"/members/{mid}/reject", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_reject_does_not_assign_member_code(client, make_user, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "rejcode@b.com").json()["id"]
    r = client.post(f"/members/{mid}/reject", headers=h)
    assert r.json()["member_code"] is None


# ── POST /members/{id}/deactivate ─────────────────────────────────────────────


def test_deactivate_member(client, make_user, auth_header, db_session, fake_email):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    mid = _request(client, _mother_id(db_session), "deact@b.com").json()["id"]
    client.post(f"/members/{mid}/approve", headers=h)
    r = client.post(f"/members/{mid}/deactivate", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "inactive"


# ── GET /members/me ───────────────────────────────────────────────────────────


def test_me_no_member_profile(client, make_user, auth_header):
    make_user("nomember@b.com")
    r = client.get("/members/me", headers=auth_header("nomember@b.com"))
    assert r.status_code == 404


def test_me_returns_member_profile(client, make_member, auth_header, db_session):
    church_id = _mother_id(db_session)
    make_member("memme@b.com", church_id)
    r = client.get("/members/me", headers=auth_header("memme@b.com"))
    assert r.status_code == 200
    assert r.json()["email"] == "memme@b.com"


def test_me_shows_member_code(client, make_member, auth_header, db_session):
    church_id = _mother_id(db_session)
    member = make_member("coded@b.com", church_id)
    member.member_code = f"MBR-{date.today().year}-0001"
    db_session.flush()
    r = client.get("/members/me", headers=auth_header("coded@b.com"))
    assert r.status_code == 200
    assert r.json()["member_code"] == f"MBR-{date.today().year}-0001"


# ── PATCH /members/me ─────────────────────────────────────────────────────────


def test_patch_me_updates_telephone(
    client, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("patched@b.com", church_id)
    h = auth_header("patched@b.com")
    r = client.patch(
        "/members/me",
        json={"telephone": "+1 (514) 555-0101"},
        headers=h,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["telephone"] == "+1 (514) 555-0101"


def test_patch_me_telephone_too_short_rejected(
    client, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("shorttel@b.com", church_id)
    r = client.patch(
        "/members/me",
        json={"telephone": "12345"},
        headers=auth_header("shorttel@b.com"),
    )
    assert r.status_code == 422


def test_patch_me_ignores_restricted_fields(
    client, make_member, auth_header, db_session
):
    """first_name, last_name, email, birth_date et sexe sont réservés à la
    gestion administrative : envoyés dans le PATCH libre-service, ils sont
    silencieusement ignorés (schéma restreint), pas rejetés en erreur."""
    from datetime import timedelta

    church_id = _mother_id(db_session)
    member = make_member("restricted@b.com", church_id)
    original_first_name = member.first_name
    original_email = member.email
    future = (date.today() + timedelta(days=1)).isoformat()

    r = client.patch(
        "/members/me",
        json={
            "first_name": "Usurped",
            "last_name": "Name",
            "email": "hijack@b.com",
            "birth_date": future,
            "sexe": "Masculin",
            "address": "1 Rue Test",
        },
        headers=auth_header("restricted@b.com"),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["first_name"] == original_first_name
    assert body["email"] == original_email
    assert body["birth_date"] is None
    assert body["sexe"] is None
    assert body["address"] == "1 Rue Test"
