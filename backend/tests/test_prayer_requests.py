from sqlalchemy import select

from app.core.config import settings
from app.models.church import Church
from app.models.rbac import Role, UserRole

BASE = "/prayer-requests"


def _admin_header(make_user, auth_header):
    make_user("admin_prayer@test.com", roles=["admin"])
    return auth_header("admin_prayer@test.com")


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _affiliate(db, name: str) -> Church:
    church = Church(name=name, parent_id=_mother_id(db))
    db.add(church)
    db.flush()
    return church


def _equipe_pastorale(make_user, auth_header, db_session, email, church_id):
    """Compte avec le rôle equipe_pastorale porté sur une église précise —
    il ne voit alors que les demandes des membres de cette église."""
    user = make_user(email)
    role = db_session.scalar(select(Role).where(Role.name == "equipe_pastorale"))
    db_session.add(UserRole(user_id=user.id, role_id=role.id, church_id=church_id))
    db_session.flush()
    return user, auth_header(email)


# ── POST /prayer-requests ────────────────────────────────────────────────────


def test_create_requires_auth(client):
    r = client.post(BASE, json={"message": "Priez pour ma famille"})
    assert r.status_code == 401


def test_create_success_sends_email_to_admin(
    client, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("pray1@test.com", church_id)
    r = client.post(
        BASE, json={"message": "Priez pour ma santé"}, headers=auth_header("pray1@test.com")
    )
    assert r.status_code == 201
    body = r.json()
    assert body["message"] == "Priez pour ma santé"
    assert body["status"] == "new"
    assert fake_email.sent
    assert fake_email.sent[0][0] == settings.admin_email


def test_create_rejects_empty_message(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("pray2@test.com", church_id)
    r = client.post(BASE, json={"message": ""}, headers=auth_header("pray2@test.com"))
    assert r.status_code == 422


# ── GET /prayer-requests/me ──────────────────────────────────────────────────


def test_list_me_requires_auth(client):
    assert client.get(f"{BASE}/me").status_code == 401


def test_list_me_isolated_between_members(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayA@test.com", church_id)
    make_member("prayB@test.com", church_id)
    client.post(BASE, json={"message": "Une prière"}, headers=auth_header("prayA@test.com"))

    r_a = client.get(f"{BASE}/me", headers=auth_header("prayA@test.com"))
    r_b = client.get(f"{BASE}/me", headers=auth_header("prayB@test.com"))
    assert len(r_a.json()) == 1
    assert len(r_b.json()) == 0


# ── GET /prayer-requests/admin ───────────────────────────────────────────────


def test_admin_list_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayplain@test.com", church_id)
    r = client.get(f"{BASE}/admin", headers=auth_header("prayplain@test.com"))
    assert r.status_code == 403


def test_admin_list_includes_member_info(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayc@test.com", church_id)
    client.post(
        BASE, json={"message": "Merci de prier pour moi"}, headers=auth_header("prayc@test.com")
    )

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["member_email"] == "prayc@test.com"
    assert body[0]["status"] == "new"


def test_admin_list_filter_by_status(
    client, make_user, make_member, auth_header, db_session
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayd@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "A"}, headers=auth_header("prayd@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)

    r_new = client.get(f"{BASE}/admin?status=new", headers=h)
    r_handled = client.get(f"{BASE}/admin?status=handled", headers=h)
    assert len(r_new.json()) == 0
    assert len(r_handled.json()) == 1


# ── PATCH /prayer-requests/{id} ──────────────────────────────────────────────


def test_update_requires_permission(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("praye@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "B"}, headers=auth_header("praye@test.com")
    ).json()["id"]
    r = client.patch(
        f"{BASE}/{req_id}", json={"status": "handled"}, headers=auth_header("praye@test.com")
    )
    assert r.status_code == 403


def test_update_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/999999", json={"status": "handled"}, headers=h)
    assert r.status_code == 404


def test_update_to_handled_sends_email_to_member(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayf@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "C"}, headers=auth_header("prayf@test.com")
    ).json()["id"]
    fake_email.sent.clear()

    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)
    assert r.status_code == 200
    assert fake_email.sent
    assert fake_email.sent[-1][0] == "prayf@test.com"


def test_update_to_new_does_not_send_handled_email(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("prayg@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "D"}, headers=auth_header("prayg@test.com")
    ).json()["id"]
    h = _admin_header(make_user, auth_header)
    client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)
    fake_email.sent.clear()

    r = client.patch(f"{BASE}/{req_id}", json={"status": "new"}, headers=h)
    assert r.status_code == 200
    assert not fake_email.sent


# ── Périmètre de l'équipe pastorale ──────────────────────────────────────────


def test_equipe_pastorale_only_sees_own_church_requests(
    client, make_user, make_member, auth_header, db_session
):
    church_a = _affiliate(db_session, "Église prière A")
    church_b = _affiliate(db_session, "Église prière B")

    make_member("prayscope_a@test.com", church_a.id)
    make_member("prayscope_b@test.com", church_b.id)
    id_a = client.post(
        BASE, json={"message": "Demande A"}, headers=auth_header("prayscope_a@test.com")
    ).json()["id"]
    id_b = client.post(
        BASE, json={"message": "Demande B"}, headers=auth_header("prayscope_b@test.com")
    ).json()["id"]

    _user, h = _equipe_pastorale(
        make_user, auth_header, db_session, "pastorale_a@test.com", church_a.id
    )
    r = client.get(f"{BASE}/admin", headers=h)

    assert r.status_code == 200
    ids = {item["id"] for item in r.json()}
    assert id_a in ids
    assert id_b not in ids


def test_equipe_pastorale_cannot_update_request_of_other_church(
    client, make_user, make_member, auth_header, db_session
):
    church_a = _affiliate(db_session, "Église prière C")
    church_b = _affiliate(db_session, "Église prière D")
    make_member("prayscope_c@test.com", church_b.id)
    req_id = client.post(
        BASE, json={"message": "Hors périmètre"}, headers=auth_header("prayscope_c@test.com")
    ).json()["id"]

    _user, h = _equipe_pastorale(
        make_user, auth_header, db_session, "pastorale_c@test.com", church_a.id
    )
    r = client.patch(f"{BASE}/{req_id}", json={"status": "handled"}, headers=h)
    assert r.status_code == 403


def test_admin_still_sees_all_churches(
    client, make_user, make_member, auth_header, db_session
):
    """Tant qu'aucune équipe pastorale locale n'existe, l'admin global voit tout."""
    church_a = _affiliate(db_session, "Église prière E")
    make_member("prayscope_d@test.com", church_a.id)
    req_id = client.post(
        BASE, json={"message": "Vue admin"}, headers=auth_header("prayscope_d@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    assert req_id in {item["id"] for item in r.json()}


# ── Prise en charge (claim) ──────────────────────────────────────────────────


def test_claim_assigns_current_user(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("prayclaim1@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "À prendre"}, headers=auth_header("prayclaim1@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    r = client.post(f"{BASE}/{req_id}/claim", headers=h)

    assert r.status_code == 200
    body = r.json()
    assert body["handled_by_email"] == "admin_prayer@test.com"
    assert body["handled_at"] is not None


def test_claim_conflicts_when_already_handled_by_someone_else(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("prayclaim2@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "Double prise"}, headers=auth_header("prayclaim2@test.com")
    ).json()["id"]

    h_first = _admin_header(make_user, auth_header)
    assert client.post(f"{BASE}/{req_id}/claim", headers=h_first).status_code == 200

    _user, h_second = _equipe_pastorale(
        make_user, auth_header, db_session, "pastorale_dup@test.com", church_id
    )
    r = client.post(f"{BASE}/{req_id}/claim", headers=h_second)
    assert r.status_code == 409


def test_claim_is_idempotent_for_same_user(
    client, make_user, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("prayclaim3@test.com", church_id)
    req_id = client.post(
        BASE, json={"message": "Reprise"}, headers=auth_header("prayclaim3@test.com")
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    client.post(f"{BASE}/{req_id}/claim", headers=h)
    r = client.post(f"{BASE}/{req_id}/claim", headers=h)
    assert r.status_code == 200


def test_claim_refused_outside_scope(
    client, make_user, make_member, auth_header, db_session
):
    church_a = _affiliate(db_session, "Église prière F")
    church_b = _affiliate(db_session, "Église prière G")
    make_member("prayclaim4@test.com", church_b.id)
    req_id = client.post(
        BASE, json={"message": "Hors périmètre claim"}, headers=auth_header("prayclaim4@test.com")
    ).json()["id"]

    _user, h = _equipe_pastorale(
        make_user, auth_header, db_session, "pastorale_f@test.com", church_a.id
    )
    r = client.post(f"{BASE}/{req_id}/claim", headers=h)
    assert r.status_code == 403
