from app.core.security import create_reset_token, create_setup_token


def test_register_success(client):
    r = client.post(
        "/auth/register", json={"email": "a@b.com", "password": "secret123"}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "a@b.com"
    assert "membre" in body["roles"]
    assert "hashed_password" not in body


def test_register_duplicate(client, make_user):
    make_user("dup@b.com")
    r = client.post(
        "/auth/register", json={"email": "dup@b.com", "password": "secret123"}
    )
    assert r.status_code == 409


def test_login_success(client, make_user):
    make_user("u@b.com")
    r = client.post(
        "/auth/login", data={"username": "u@b.com", "password": "secret123"}
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, make_user):
    make_user("u@b.com")
    r = client.post("/auth/login", data={"username": "u@b.com", "password": "mauvais"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post(
        "/auth/login", data={"username": "ghost@b.com", "password": "secret123"}
    )
    assert r.status_code == 401


def test_inactive_user_cannot_login(client, make_user, db_session):
    user = make_user("inactive@b.com")
    user.is_active = False
    db_session.flush()
    r = client.post(
        "/auth/login", data={"username": "inactive@b.com", "password": "secret123"}
    )
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_current_user(client, make_user, auth_header):
    make_user("me@b.com", roles=["membre"])
    r = client.get("/auth/me", headers=auth_header("me@b.com"))
    assert r.status_code == 200
    assert r.json()["email"] == "me@b.com"


def test_me_returns_permissions(client, make_user, auth_header):
    make_user("perms@b.com", roles=["admin"])
    r = client.get("/auth/me", headers=auth_header("perms@b.com"))
    assert r.status_code == 200
    assert "*" in r.json()["permissions"]


# ── set-password ──────────────────────────────────────────────────────────────


def test_set_password_success(client, make_user, db_session):
    user = make_user("invite@b.com")
    token = create_setup_token(user.id, user.token_version)
    r = client.post(
        "/auth/set-password", json={"token": token, "password": "newpass99"}
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_set_password_activates_user(client, make_user, db_session):
    user = make_user("invited2@b.com")
    user.is_active = False
    db_session.flush()
    token = create_setup_token(user.id, user.token_version)
    client.post("/auth/set-password", json={"token": token, "password": "newpass99"})
    db_session.refresh(user)
    assert user.is_active is True


def test_set_password_invalid_token(client):
    r = client.post(
        "/auth/set-password", json={"token": "not-a-jwt", "password": "newpass99"}
    )
    assert r.status_code == 400


def test_set_password_token_invalidated_after_use(client, make_user, db_session):
    user = make_user("oncetime@b.com")
    token = create_setup_token(user.id, user.token_version)
    client.post("/auth/set-password", json={"token": token, "password": "newpass99"})
    r = client.post("/auth/set-password", json={"token": token, "password": "other99"})
    assert r.status_code == 400


def test_set_password_too_short(client, make_user):
    user = make_user("short@b.com")
    token = create_setup_token(user.id, user.token_version)
    r = client.post("/auth/set-password", json={"token": token, "password": "abc"})
    assert r.status_code == 422


# ── forgot-password ────────────────────────────────────────────────────────────


def test_forgot_password_returns_204(client, make_user):
    make_user("exist@b.com")
    r = client.post("/auth/forgot-password", json={"email": "exist@b.com"})
    assert r.status_code == 204


def test_forgot_password_unknown_email_still_204(client):
    r = client.post("/auth/forgot-password", json={"email": "nope@b.com"})
    assert r.status_code == 204


def test_forgot_password_sends_email(client, fake_email, make_user):
    make_user("forgot@b.com")
    client.post("/auth/forgot-password", json={"email": "forgot@b.com"})
    assert any("forgot@b.com" == to for to, *_ in fake_email.sent)


def test_forgot_password_unknown_email_no_email_sent(client, fake_email):
    client.post("/auth/forgot-password", json={"email": "ghost@b.com"})
    assert not fake_email.sent


def test_forgot_password_inactive_user_no_email_sent(
    client, fake_email, make_user, db_session
):
    user = make_user("inactive@b.com")
    user.is_active = False
    db_session.flush()
    client.post("/auth/forgot-password", json={"email": "inactive@b.com"})
    assert not fake_email.sent


# ── reset-password ─────────────────────────────────────────────────────────────


def test_reset_password_success(client, make_user, db_session):
    user = make_user("reset@b.com")
    token = create_reset_token(user.id, user.token_version)
    r = client.post(
        "/auth/reset-password", json={"token": token, "password": "newpass99"}
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_reset_password_can_login_after(client, make_user, db_session):
    user = make_user("resetlogin@b.com", password="oldpass")
    token = create_reset_token(user.id, user.token_version)
    client.post("/auth/reset-password", json={"token": token, "password": "newpass99"})
    r = client.post(
        "/auth/login", data={"username": "resetlogin@b.com", "password": "newpass99"}
    )
    assert r.status_code == 200


def test_reset_password_token_single_use(client, make_user, db_session):
    user = make_user("singleuse@b.com")
    token = create_reset_token(user.id, user.token_version)
    client.post("/auth/reset-password", json={"token": token, "password": "newpass99"})
    r = client.post(
        "/auth/reset-password", json={"token": token, "password": "again999"}
    )
    assert r.status_code == 400


def test_reset_password_wrong_purpose_rejected(client, make_user):
    user = make_user("wrongp@b.com")
    setup_token = create_setup_token(user.id, user.token_version)
    r = client.post(
        "/auth/reset-password", json={"token": setup_token, "password": "newpass99"}
    )
    assert r.status_code == 400


def test_set_password_wrong_purpose_rejected(client, make_user):
    user = make_user("wrongp2@b.com")
    reset_token = create_reset_token(user.id, user.token_version)
    r = client.post(
        "/auth/set-password", json={"token": reset_token, "password": "newpass99"}
    )
    assert r.status_code == 400


def test_reset_password_invalid_token(client):
    r = client.post(
        "/auth/reset-password", json={"token": "garbage", "password": "newpass99"}
    )
    assert r.status_code == 400


def test_reset_password_too_short(client, make_user):
    user = make_user("shortreset@b.com")
    token = create_reset_token(user.id, user.token_version)
    r = client.post("/auth/reset-password", json={"token": token, "password": "abc"})
    assert r.status_code == 422
