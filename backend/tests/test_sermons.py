from unittest.mock import MagicMock, patch

import pytest

from app.models.sermon import Sermon, SermonStatus


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sermon(db_session, title="Titre Test", status=SermonStatus.draft, preacher="Pasteur X"):
    s = Sermon(
        title=title,
        preacher=preacher,
        sermon_date="2025-03-01",
        format="audio",
        file_key="sermons/1/test.mp3",
        status=status,
    )
    db_session.add(s)
    db_session.flush()
    return s


def _admin_header(make_user, auth_header):
    make_user("admin_sermon@test.com", roles=["admin"])
    return auth_header("admin_sermon@test.com")


# ── Liste publique ─────────────────────────────────────────────────────────────

def test_list_public_only_published(client, db_session):
    _sermon(db_session, "Brouillon", SermonStatus.draft)
    _sermon(db_session, "Publié", SermonStatus.published)
    _sermon(db_session, "Archivé", SermonStatus.archived)

    r = client.get("/sermons")
    assert r.status_code == 200
    titles = [s["title"] for s in r.json()["items"]]
    assert "Publié" in titles
    assert "Brouillon" not in titles
    assert "Archivé" not in titles


def test_list_public_search(client, db_session):
    _sermon(db_session, "Amour de Dieu", SermonStatus.published)
    _sermon(db_session, "La Foi", SermonStatus.published)

    r = client.get("/sermons?q=amour")
    assert r.status_code == 200
    titles = [s["title"] for s in r.json()["items"]]
    assert any("Amour" in t for t in titles)
    assert all("Foi" not in t for t in titles)


# ── Liste admin ────────────────────────────────────────────────────────────────

def test_list_admin_all_statuses(client, db_session, make_user, auth_header):
    _sermon(db_session, "A-draft", SermonStatus.draft)
    _sermon(db_session, "A-published", SermonStatus.published)
    _sermon(db_session, "A-archived", SermonStatus.archived)
    h = _admin_header(make_user, auth_header)

    r = client.get("/sermons/admin", headers=h)
    assert r.status_code == 200
    titles = [s["title"] for s in r.json()["items"]]
    assert "A-draft" in titles
    assert "A-published" in titles
    assert "A-archived" in titles


def test_list_admin_filter_by_status(client, db_session, make_user, auth_header):
    _sermon(db_session, "B-draft", SermonStatus.draft)
    _sermon(db_session, "B-published", SermonStatus.published)
    h = _admin_header(make_user, auth_header)

    r = client.get("/sermons/admin?status=draft", headers=h)
    assert r.status_code == 200
    titles = [s["title"] for s in r.json()["items"]]
    assert "B-draft" in titles
    assert "B-published" not in titles


def test_list_admin_requires_auth(client):
    r = client.get("/sermons/admin")
    assert r.status_code == 401


def test_list_admin_requires_permission(client, make_user, auth_header):
    make_user("regular_sermon@test.com")
    h = auth_header("regular_sermon@test.com")
    r = client.get("/sermons/admin", headers=h)
    assert r.status_code == 403


# ── GET /{id} ──────────────────────────────────────────────────────────────────

def test_get_published_increments_views(client, db_session):
    s = _sermon(db_session, "Views Test", SermonStatus.published)
    initial_views = s.views

    r = client.get(f"/sermons/{s.id}")
    assert r.status_code == 200
    assert r.json()["views"] == initial_views + 1


def test_get_draft_returns_404(client, db_session):
    s = _sermon(db_session, "Draft Hidden", SermonStatus.draft)
    r = client.get(f"/sermons/{s.id}")
    assert r.status_code == 404


def test_get_archived_returns_404(client, db_session):
    s = _sermon(db_session, "Archived Hidden", SermonStatus.archived)
    r = client.get(f"/sermons/{s.id}")
    assert r.status_code == 404


def test_get_nonexistent_returns_404(client):
    r = client.get("/sermons/999999")
    assert r.status_code == 404


# ── POST (create) ──────────────────────────────────────────────────────────────

def test_create_sermon(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    fake_storage = MagicMock()
    fake_storage.upload_file.return_value = None

    with patch("app.api.routes.sermons.storage", fake_storage):
        r = client.post(
            "/sermons",
            headers=h,
            data={
                "title": "La grâce divine",
                "preacher": "Pasteur Dupont",
                "sermon_date": "2025-06-01",
                "status": "draft",
            },
            files={"file": ("sermon.mp3", b"fakeaudio", "audio/mpeg")},
        )

    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "La grâce divine"
    assert body["preacher"] == "Pasteur Dupont"
    assert body["status"] == "draft"
    assert body["format"] == "audio"
    fake_storage.upload_file.assert_called_once()


def test_create_sermon_video_format(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    fake_storage = MagicMock()

    with patch("app.api.routes.sermons.storage", fake_storage):
        r = client.post(
            "/sermons",
            headers=h,
            data={
                "title": "Sermon Vidéo",
                "preacher": "Pasteur Vidéo",
                "sermon_date": "2025-06-10",
                "status": "published",
            },
            files={"file": ("sermon.mp4", b"fakevideo", "video/mp4")},
        )

    assert r.status_code == 201
    assert r.json()["format"] == "video"
    assert r.json()["status"] == "published"


def test_create_requires_auth(client):
    r = client.post("/sermons", data={"title": "x"})
    assert r.status_code == 401


def test_create_requires_permission(client, make_user, auth_header):
    make_user("norole_sermon@test.com")
    h = auth_header("norole_sermon@test.com")

    with patch("app.api.routes.sermons.storage", MagicMock()):
        r = client.post(
            "/sermons",
            headers=h,
            data={
                "title": "Refusé",
                "preacher": "X",
                "sermon_date": "2025-01-01",
            },
            files={"file": ("f.mp3", b"data", "audio/mpeg")},
        )
    assert r.status_code == 403


# ── PATCH (update) ─────────────────────────────────────────────────────────────

def test_update_sermon_fields(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "Original", SermonStatus.draft)
    h = _admin_header(make_user, auth_header)

    r = client.patch(
        f"/sermons/{s.id}",
        headers=h,
        json={
            "title": "Modifié",
            "preacher": "Nouveau Pasteur",
            "description": "Belle description",
            "series": "Série A",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Modifié"
    assert body["preacher"] == "Nouveau Pasteur"
    assert body["description"] == "Belle description"
    assert body["series"] == "Série A"


def test_update_sermon_status_to_published(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "A publier", SermonStatus.draft)
    h = _admin_header(make_user, auth_header)

    r = client.patch(f"/sermons/{s.id}", headers=h, json={"status": "published"})
    assert r.status_code == 200
    assert r.json()["status"] == "published"


def test_update_sermon_status_to_archived(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "A archiver", SermonStatus.published)
    h = _admin_header(make_user, auth_header)

    r = client.patch(f"/sermons/{s.id}", headers=h, json={"status": "archived"})
    assert r.status_code == 200
    assert r.json()["status"] == "archived"


def test_update_partial_fields_unchanged(client, db_session, make_user, auth_header):
    """Seuls les champs envoyés sont modifiés."""
    s = _sermon(db_session, "Stable", SermonStatus.draft, preacher="Pasteur Stable")
    h = _admin_header(make_user, auth_header)

    r = client.patch(f"/sermons/{s.id}", headers=h, json={"title": "Nouveau titre"})
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Nouveau titre"
    assert body["preacher"] == "Pasteur Stable"


def test_update_nonexistent_returns_404(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.patch("/sermons/999999", headers=h, json={"title": "X"})
    assert r.status_code == 404


def test_update_requires_permission(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "Protégé", SermonStatus.draft)
    make_user("noperm_patch@test.com")
    h = auth_header("noperm_patch@test.com")

    r = client.patch(f"/sermons/{s.id}", headers=h, json={"title": "Hack"})
    assert r.status_code == 403


# ── DELETE ─────────────────────────────────────────────────────────────────────

def test_delete_sermon(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "A supprimer", SermonStatus.draft)
    h = _admin_header(make_user, auth_header)
    fake_storage = MagicMock()

    with patch("app.api.routes.sermons.storage", fake_storage):
        r = client.delete(f"/sermons/{s.id}", headers=h)
    assert r.status_code == 204
    fake_storage.delete_file.assert_called_once_with(s.file_key)


def test_delete_sermon_no_longer_visible(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "Supprimé check", SermonStatus.published)
    h = _admin_header(make_user, auth_header)

    with patch("app.api.routes.sermons.storage", MagicMock()):
        client.delete(f"/sermons/{s.id}", headers=h)

    r = client.get(f"/sermons/{s.id}")
    assert r.status_code == 404


def test_delete_nonexistent_returns_404(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    with patch("app.api.routes.sermons.storage", MagicMock()):
        r = client.delete("/sermons/999999", headers=h)
    assert r.status_code == 404


def test_delete_requires_permission(client, db_session, make_user, auth_header):
    s = _sermon(db_session, "Protégé del", SermonStatus.draft)
    make_user("noperm_del@test.com")
    h = auth_header("noperm_del@test.com")

    with patch("app.api.routes.sermons.storage", MagicMock()):
        r = client.delete(f"/sermons/{s.id}", headers=h)
    assert r.status_code == 403
