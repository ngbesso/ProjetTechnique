from sqlalchemy import select

from app.core.config import settings
from app.models.church import Church
from app.models.rbac import Permission, Role, UserRole

BASE = "/member-requests"


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _affiliate(db, name: str) -> Church:
    church = Church(name=name, parent_id=_mother_id(db))
    db.add(church)
    db.flush()
    return church


def _admin_header(make_user, auth_header):
    make_user("admin_memreq@test.com", roles=["admin"])
    return auth_header("admin_memreq@test.com")


def _scoped_manager(make_user, auth_header, db_session, email, church_id):
    """Compte doté d'un rôle ad hoc portant la seule permission
    member_request:manage, porté sur une église précise."""
    user = make_user(email)
    perm = db_session.scalar(
        select(Permission).where(Permission.code == "member_request:manage")
    )
    role = db_session.scalar(select(Role).where(Role.name == "gestionnaire-demandes"))
    if role is None:
        role = Role(name="gestionnaire-demandes", description="Demandes des membres")
        db_session.add(role)
        db_session.flush()
        role.permissions = [perm]
    db_session.add(UserRole(user_id=user.id, role_id=role.id, church_id=church_id))
    db_session.flush()
    return user, auth_header(email)


def _create(client, auth_header, email, request_type="Autre", message="Bonjour"):
    return client.post(
        BASE,
        json={"request_type": request_type, "message": message},
        headers=auth_header(email),
    )


# ── POST /member-requests ────────────────────────────────────────────────────


def test_create_requires_auth(client):
    r = client.post(BASE, json={"request_type": "Autre", "message": "Test"})
    assert r.status_code == 401


def test_create_success_sends_email_to_admin(
    client, make_member, auth_header, db_session, fake_email
):
    make_member("memreq1@test.com", _mother_id(db_session))
    r = _create(
        client,
        auth_header,
        "memreq1@test.com",
        request_type="Modification de mes informations",
        message="Merci de corriger mon nom",
    )
    assert r.status_code == 201
    body = r.json()
    assert body["request_type"] == "Modification de mes informations"
    assert body["status"] == "new"
    assert body["admin_response"] is None
    assert body["resolved_at"] is None
    assert fake_email.sent
    assert fake_email.sent[0][0] == settings.admin_email


def test_create_rejects_empty_message(client, make_member, auth_header, db_session):
    make_member("memreq2@test.com", _mother_id(db_session))
    r = _create(client, auth_header, "memreq2@test.com", message="")
    assert r.status_code == 422


# ── GET /member-requests/me ──────────────────────────────────────────────────


def test_list_me_requires_auth(client):
    assert client.get(f"{BASE}/me").status_code == 401


def test_list_me_isolated_between_members(
    client, make_member, auth_header, db_session
):
    church_id = _mother_id(db_session)
    make_member("memreq_a@test.com", church_id)
    make_member("memreq_b@test.com", church_id)
    _create(client, auth_header, "memreq_a@test.com", message="Demande de A")

    r_a = client.get(f"{BASE}/me", headers=auth_header("memreq_a@test.com"))
    r_b = client.get(f"{BASE}/me", headers=auth_header("memreq_b@test.com"))
    assert len(r_a.json()) == 1
    assert len(r_b.json()) == 0


# ── GET /member-requests/admin ───────────────────────────────────────────────


def test_admin_list_requires_permission(client, make_member, auth_header, db_session):
    make_member("memreq_plain@test.com", _mother_id(db_session))
    r = client.get(f"{BASE}/admin", headers=auth_header("memreq_plain@test.com"))
    assert r.status_code == 403


def test_admin_list_includes_member_info(
    client, make_user, make_member, auth_header, db_session
):
    make_member("memreq_info@test.com", _mother_id(db_session))
    _create(client, auth_header, "memreq_info@test.com", message="Avec infos")

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    match = next(item for item in r.json() if item["member_email"] == "memreq_info@test.com")
    assert match["member_name"]
    assert match["message"] == "Avec infos"


def test_admin_list_filters_by_status_and_type(
    client, make_user, make_member, auth_header, db_session
):
    make_member("memreq_filter@test.com", _mother_id(db_session))
    _create(client, auth_header, "memreq_filter@test.com", request_type="Autre", message="X")
    _create(
        client,
        auth_header,
        "memreq_filter@test.com",
        request_type="Question administrative",
        message="Y",
    )

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin?request_type=Question administrative", headers=h)
    assert r.status_code == 200
    assert all(item["request_type"] == "Question administrative" for item in r.json())

    r_new = client.get(f"{BASE}/admin?status=resolved", headers=h)
    assert all(item["status"] == "resolved" for item in r_new.json())


# ── Périmètre par église ─────────────────────────────────────────────────────


def test_scoped_manager_only_sees_own_church_requests(
    client, make_user, make_member, auth_header, db_session
):
    church_a = _affiliate(db_session, "Église demandes A")
    church_b = _affiliate(db_session, "Église demandes B")
    make_member("memreq_scope_a@test.com", church_a.id)
    make_member("memreq_scope_b@test.com", church_b.id)
    id_a = _create(client, auth_header, "memreq_scope_a@test.com", message="A").json()["id"]
    id_b = _create(client, auth_header, "memreq_scope_b@test.com", message="B").json()["id"]

    _user, h = _scoped_manager(
        make_user, auth_header, db_session, "gest_a@test.com", church_a.id
    )
    r = client.get(f"{BASE}/admin", headers=h)

    assert r.status_code == 200
    ids = {item["id"] for item in r.json()}
    assert id_a in ids
    assert id_b not in ids


def test_scoped_manager_cannot_update_other_church_request(
    client, make_user, make_member, auth_header, db_session
):
    church_a = _affiliate(db_session, "Église demandes C")
    church_b = _affiliate(db_session, "Église demandes D")
    make_member("memreq_scope_c@test.com", church_b.id)
    req_id = _create(client, auth_header, "memreq_scope_c@test.com", message="Hors").json()["id"]

    _user, h = _scoped_manager(
        make_user, auth_header, db_session, "gest_c@test.com", church_a.id
    )
    r = client.patch(f"{BASE}/{req_id}", json={"status": "resolved"}, headers=h)
    assert r.status_code == 403


def test_admin_sees_all_churches(
    client, make_user, make_member, auth_header, db_session
):
    church = _affiliate(db_session, "Église demandes E")
    make_member("memreq_scope_d@test.com", church.id)
    req_id = _create(client, auth_header, "memreq_scope_d@test.com", message="Vue admin").json()["id"]

    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/admin", headers=h)
    assert req_id in {item["id"] for item in r.json()}


# ── PATCH /member-requests/{id} ──────────────────────────────────────────────


def test_resolve_sends_email_with_response(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    make_member("memreq_res@test.com", _mother_id(db_session))
    req_id = _create(
        client, auth_header, "memreq_res@test.com", request_type="Autre", message="À résoudre"
    ).json()["id"]

    h = _admin_header(make_user, auth_header)
    fake_email.sent.clear()
    r = client.patch(
        f"{BASE}/{req_id}",
        json={"status": "resolved", "admin_response": "C'est corrigé."},
        headers=h,
    )

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "resolved"
    assert body["admin_response"] == "C'est corrigé."
    assert body["resolved_at"] is not None
    assert body["handled_by_email"] == "admin_memreq@test.com"
    assert fake_email.sent
    assert fake_email.sent[-1][0] == "memreq_res@test.com"


def test_in_progress_does_not_send_email_nor_resolve(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    make_member("memreq_prog@test.com", _mother_id(db_session))
    req_id = _create(client, auth_header, "memreq_prog@test.com", message="En cours").json()["id"]

    h = _admin_header(make_user, auth_header)
    fake_email.sent.clear()
    r = client.patch(f"{BASE}/{req_id}", json={"status": "in_progress"}, headers=h)

    assert r.status_code == 200
    assert r.json()["resolved_at"] is None
    assert not fake_email.sent


def test_resolving_twice_does_not_resend_email(
    client, make_user, make_member, auth_header, db_session, fake_email
):
    make_member("memreq_twice@test.com", _mother_id(db_session))
    req_id = _create(client, auth_header, "memreq_twice@test.com", message="Deux fois").json()["id"]

    h = _admin_header(make_user, auth_header)
    client.patch(f"{BASE}/{req_id}", json={"status": "resolved"}, headers=h)
    fake_email.sent.clear()

    r = client.patch(f"{BASE}/{req_id}", json={"status": "resolved"}, headers=h)
    assert r.status_code == 200
    assert not fake_email.sent


def test_member_sees_admin_response_in_own_list(
    client, make_user, make_member, auth_header, db_session
):
    make_member("memreq_see@test.com", _mother_id(db_session))
    req_id = _create(client, auth_header, "memreq_see@test.com", message="Réponse ?").json()["id"]

    h = _admin_header(make_user, auth_header)
    client.patch(
        f"{BASE}/{req_id}",
        json={"status": "resolved", "admin_response": "Voici la réponse."},
        headers=h,
    )

    r = client.get(f"{BASE}/me", headers=auth_header("memreq_see@test.com"))
    match = next(item for item in r.json() if item["id"] == req_id)
    assert match["admin_response"] == "Voici la réponse."
    assert match["status"] == "resolved"


def test_update_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch(f"{BASE}/999999", json={"status": "resolved"}, headers=h)
    assert r.status_code == 404


# ── GET /member-requests/admin/stats ─────────────────────────────────────────


def test_stats_counts_by_status(client, make_user, make_member, auth_header, db_session):
    make_member("memreq_stats@test.com", _mother_id(db_session))
    h = _admin_header(make_user, auth_header)
    baseline = client.get(f"{BASE}/admin/stats", headers=h).json()

    _create(client, auth_header, "memreq_stats@test.com", message="Stat 1")
    req_id = _create(client, auth_header, "memreq_stats@test.com", message="Stat 2").json()["id"]
    client.patch(f"{BASE}/{req_id}", json={"status": "resolved"}, headers=h)

    stats = client.get(f"{BASE}/admin/stats", headers=h).json()
    assert stats["new"] == baseline["new"] + 1
    assert stats["resolved"] == baseline["resolved"] + 1
    assert stats["total"] == baseline["total"] + 2


# ── Paramètre member_request_type ────────────────────────────────────────────


def test_member_request_type_parameter_is_seeded(client):
    labels = [v["label"] for v in client.get("/parameters/member_request_type").json()]
    assert "Modification de mes informations" in labels
    assert "Rejoindre un ministère" in labels
    assert "Question administrative" in labels
    assert "Autre" in labels
