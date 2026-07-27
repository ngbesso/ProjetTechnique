from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

from app.models.post import Post, PostStatus


def _post(db_session, title="Titre Test", status=PostStatus.draft, author="Auteur X"):
    p = Post(title=title, content="Contenu", author=author, status=status)
    db_session.add(p)
    db_session.flush()
    return p


def _admin_header(make_user, auth_header):
    make_user("admin_post@test.com", roles=["admin"])
    return auth_header("admin_post@test.com")


def _post_payload(**overrides):
    payload = {
        "title": "Nouvel article",
        "content": "Contenu de l'article",
        "author": "Auteur Y",
    }
    payload.update(overrides)
    return payload


class _FakeBody:
    def __init__(self, data: bytes):
        self._data = data

    def iter_chunks(self, chunk_size):
        yield self._data


def _fake_storage(content_type="image/jpeg"):
    fake = MagicMock()
    fake.upload_file.return_value = None
    fake.delete_file.return_value = None
    fake.get_object.return_value = {
        "Body": _FakeBody(b"fake-image-bytes"),
        "ContentType": content_type,
    }
    return fake


# ── GET /posts/admin/stats ──────────────────────────────────────────────────────


def test_stats_requires_auth(client):
    r = client.get("/posts/admin/stats")
    assert r.status_code == 401


def test_stats_requires_permission(client, make_user, auth_header):
    make_user("regular_post@test.com")
    h = auth_header("regular_post@test.com")
    r = client.get("/posts/admin/stats", headers=h)
    assert r.status_code == 403


def test_stats_counts_and_top_posts(client, db_session, make_user, auth_header):
    """Les comptages sont vérifiés en delta (avant/après), pas en absolu : les
    articles de démonstration insérés par seed_posts() lors du démarrage de
    l'app (commit réel, hors transaction de test) restent présents pour toute
    la session de tests et fausseraient des assertions sur des totaux fixes."""
    h = _admin_header(make_user, auth_header)
    baseline = client.get("/posts/admin/stats", headers=h).json()

    p1 = _post(db_session, "Populaire", PostStatus.published)
    p1.views = 200
    p2 = _post(db_session, "Moyen", PostStatus.published)
    p2.views = 75
    p3 = _post(db_session, "Brouillon", PostStatus.draft)
    p3.views = 3
    db_session.flush()

    r = client.get("/posts/admin/stats", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["published"] == baseline["published"] + 2
    assert body["draft"] == baseline["draft"] + 1
    assert body["total_views"] == baseline["total_views"] + 278
    assert body["top_posts"][0]["title"] == "Populaire"
    assert body["top_posts"][0]["views"] == 200
    assert body["top_posts"][1]["title"] == "Moyen"


def test_stats_views_increment_on_public_read(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    baseline = client.get("/posts/admin/stats", headers=h).json()

    p = _post(db_session, "Lu publiquement", PostStatus.published)
    r = client.get(f"/posts/{p.id}")
    assert r.status_code == 200
    assert r.json()["views"] == 1

    stats = client.get("/posts/admin/stats", headers=h).json()
    assert stats["total_views"] == baseline["total_views"] + 1


# ── GET /posts/admin (liste admin, filtrage brouillons) ───────────────────────


def test_list_admin_requires_permission(client, make_user, auth_header):
    make_user("regular_list@test.com")
    h = auth_header("regular_list@test.com")
    r = client.get("/posts/admin", headers=h)
    assert r.status_code == 403


def test_list_admin_includes_drafts(client, db_session, make_user, auth_header):
    """La liste publique masque les brouillons ; la liste admin doit les inclure."""
    h = _admin_header(make_user, auth_header)
    _post(db_session, "Brouillon Admin", PostStatus.draft)
    _post(db_session, "Publié Admin", PostStatus.published)

    r_public = client.get("/posts")
    assert r_public.status_code == 200
    public_titles = [p["title"] for p in r_public.json()["items"]]
    assert "Brouillon Admin" not in public_titles

    r_admin = client.get("/posts/admin", headers=h)
    assert r_admin.status_code == 200
    admin_titles = [p["title"] for p in r_admin.json()["items"]]
    assert "Brouillon Admin" in admin_titles
    assert "Publié Admin" in admin_titles


def test_list_admin_filters_by_status(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    _post(db_session, "Filtré Brouillon", PostStatus.draft)
    _post(db_session, "Filtré Publié", PostStatus.published)

    r = client.get("/posts/admin?status=draft", headers=h)
    assert r.status_code == 200
    titles = [p["title"] for p in r.json()["items"]]
    assert "Filtré Brouillon" in titles
    assert "Filtré Publié" not in titles


# ── POST /posts (create) ────────────────────────────────────────────────────


def test_create_post_requires_auth(client):
    r = client.post("/posts", json=_post_payload())
    assert r.status_code == 401


def test_create_post_requires_permission(client, make_user, auth_header):
    make_user("regular_create@test.com")
    h = auth_header("regular_create@test.com")
    r = client.post("/posts", json=_post_payload(), headers=h)
    assert r.status_code == 403


def test_create_post_success(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.post("/posts", json=_post_payload(title="Article Créé"), headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Article Créé"
    assert body["status"] == "draft"
    assert body["views"] == 0


# ── PATCH /posts/{id} (update) ──────────────────────────────────────────────


def test_update_post_requires_permission(client, db_session, make_user, auth_header):
    make_user("regular_update@test.com")
    h = auth_header("regular_update@test.com")
    p = _post(db_session, "À modifier")
    r = client.patch(f"/posts/{p.id}", json={"title": "Piraté"}, headers=h)
    assert r.status_code == 403


def test_update_post_success(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    p = _post(db_session, "Titre Original")
    r = client.patch(
        f"/posts/{p.id}",
        json={"title": "Titre Modifié", "status": "published"},
        headers=h,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Titre Modifié"
    assert body["status"] == "published"


def test_update_post_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch("/posts/999999", json={"title": "X"}, headers=h)
    assert r.status_code == 404


# ── DELETE /posts/{id} ───────────────────────────────────────────────────────


def test_delete_post_requires_permission(client, db_session, make_user, auth_header):
    make_user("regular_delete@test.com")
    h = auth_header("regular_delete@test.com")
    p = _post(db_session, "À supprimer")
    r = client.delete(f"/posts/{p.id}", headers=h)
    assert r.status_code == 403


def test_delete_post_success(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    p = _post(db_session, "Article Éphémère")
    post_id = p.id
    r = client.delete(f"/posts/{post_id}", headers=h)
    assert r.status_code == 204
    assert client.get(f"/posts/{post_id}").status_code == 404


def test_delete_post_not_found(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.delete("/posts/999999", headers=h)
    assert r.status_code == 404


# ── Couverture d'image : GET/POST/DELETE /posts/{id}/cover ────────────────────


def test_get_cover_no_cover_set(client, db_session):
    p = _post(db_session, "Sans couverture")
    r = client.get(f"/posts/{p.id}/cover")
    assert r.status_code == 404


def test_get_cover_success(client, db_session):
    p = _post(db_session, "Avec couverture")
    p.cover_image_url = f"/posts/{p.id}/cover"
    db_session.flush()
    with patch("app.services.content_service.storage", _fake_storage()):
        r = client.get(f"/posts/{p.id}/cover")
    assert r.status_code == 200
    assert r.content == b"fake-image-bytes"
    assert r.headers["content-type"] == "image/jpeg"


def test_get_cover_missing_in_storage(client, db_session):
    p = _post(db_session, "Couverture manquante")
    p.cover_image_url = f"/posts/{p.id}/cover"
    db_session.flush()
    fake = MagicMock()
    fake.get_object.side_effect = ClientError(
        {"Error": {"Code": "NoSuchKey", "Message": "Not Found"}}, "GetObject"
    )
    with patch("app.services.content_service.storage", fake):
        r = client.get(f"/posts/{p.id}/cover")
    assert r.status_code == 404


def test_upload_cover_requires_permission(client, db_session, make_user, auth_header):
    make_user("regular_cover@test.com")
    h = auth_header("regular_cover@test.com")
    p = _post(db_session, "Cible upload")
    with patch("app.services.content_service.storage", _fake_storage()):
        r = client.post(
            f"/posts/{p.id}/cover",
            files={"file": ("cover.jpg", b"fake-bytes", "image/jpeg")},
            headers=h,
        )
    assert r.status_code == 403


def test_upload_cover_success(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    p = _post(db_session, "Cible upload admin")
    fake = _fake_storage()
    with patch("app.services.content_service.storage", fake):
        r = client.post(
            f"/posts/{p.id}/cover",
            files={"file": ("cover.jpg", b"fake-bytes", "image/jpeg")},
            headers=h,
        )
    assert r.status_code == 200
    body = r.json()
    assert body["cover_image_url"] == f"/posts/{p.id}/cover"
    fake.upload_file.assert_called_once()
    args, _kwargs = fake.upload_file.call_args
    assert args[1] == f"posts/covers/{p.id}"


def test_delete_cover_requires_permission(client, db_session, make_user, auth_header):
    make_user("regular_delcover@test.com")
    h = auth_header("regular_delcover@test.com")
    p = _post(db_session, "Cible suppression")
    p.cover_image_url = f"/posts/{p.id}/cover"
    db_session.flush()
    with patch("app.services.content_service.storage", _fake_storage()):
        r = client.delete(f"/posts/{p.id}/cover", headers=h)
    assert r.status_code == 403


def test_delete_cover_success(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    p = _post(db_session, "Cible suppression admin")
    p.cover_image_url = f"/posts/{p.id}/cover"
    db_session.flush()
    fake = _fake_storage()
    with patch("app.services.content_service.storage", fake):
        r = client.delete(f"/posts/{p.id}/cover", headers=h)
    assert r.status_code == 204
    fake.delete_file_quiet.assert_called_once_with(f"posts/covers/{p.id}")

    refreshed = client.get("/posts/admin?status=draft", headers=h).json()
    match = next(item for item in refreshed["items"] if item["id"] == p.id)
    assert match["cover_image_url"] is None
