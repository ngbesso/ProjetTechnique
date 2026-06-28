def test_register_success(client):
    r = client.post(
        "/auth/register", json={"email": "a@b.com", "password": "secret123"}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "a@b.com"
    assert "membre" in body["roles"]
    assert "hashed_password" not in body  # jamais exposé


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
    assert r.status_code == 200 and "access_token" in r.json()


def test_login_wrong_password(client, make_user):
    make_user("u@b.com")
    r = client.post("/auth/login", data={"username": "u@b.com", "password": "mauvais"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_current_user(client, make_user, auth_header):
    make_user("me@b.com", roles=["membre"])
    r = client.get("/auth/me", headers=auth_header("me@b.com"))
    assert r.status_code == 200 and r.json()["email"] == "me@b.com"
