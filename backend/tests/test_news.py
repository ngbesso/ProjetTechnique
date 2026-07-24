from app.models.news import News, NewsStatus


def _news(
    db_session, title="Titre Test", status=NewsStatus.draft, author="Auteur X", **kw
):
    n = News(title=title, content="Contenu", author=author, status=status, **kw)
    db_session.add(n)
    db_session.flush()
    return n


def _admin_header(make_user, auth_header):
    make_user("admin_news@test.com", roles=["admin"])
    return auth_header("admin_news@test.com")


# ── GET /news/admin ──────────────────────────────────────────────────────────


def test_admin_list_requires_auth(client):
    r = client.get("/news/admin")
    assert r.status_code == 401


def test_admin_list_requires_permission(client, make_user, auth_header):
    make_user("regular_news@test.com")
    h = auth_header("regular_news@test.com")
    r = client.get("/news/admin", headers=h)
    assert r.status_code == 403


def test_admin_list_includes_drafts(client, db_session, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    _news(db_session, "Brouillon admin", NewsStatus.draft)
    r = client.get("/news/admin", headers=h)
    assert r.status_code == 200
    titles = [n["title"] for n in r.json()["items"]]
    assert "Brouillon admin" in titles


# ── GET /news (public) ───────────────────────────────────────────────────────


def test_public_list_excludes_drafts(client, db_session):
    _news(db_session, "Public brouillon", NewsStatus.draft)
    published = _news(db_session, "Public publié", NewsStatus.published)
    r = client.get("/news")
    assert r.status_code == 200
    titles = [n["title"] for n in r.json()["items"]]
    assert "Public brouillon" not in titles
    assert published.title in titles


def test_get_news_item_increments_views(client, db_session):
    n = _news(db_session, "Vue publique", NewsStatus.published)
    r = client.get(f"/news/{n.id}")
    assert r.status_code == 200
    assert r.json()["views"] == 1


def test_get_draft_news_item_returns_404(client, db_session):
    n = _news(db_session, "Brouillon caché", NewsStatus.draft)
    r = client.get(f"/news/{n.id}")
    assert r.status_code == 404


# ── GET /news/featured (carrousel hybride) ───────────────────────────────────


def test_featured_prioritizes_pinned_items(client, db_session):
    _news(db_session, "Épinglé 1", NewsStatus.published, is_featured=True, position=0)
    _news(db_session, "Épinglé 2", NewsStatus.published, is_featured=True, position=1)
    r = client.get("/news/featured", params={"limit": 2})
    assert r.status_code == 200
    titles = [n["title"] for n in r.json()]
    assert titles == ["Épinglé 1", "Épinglé 2"]


def test_featured_falls_back_to_recent_when_not_enough_pinned(client, db_session):
    _news(
        db_session, "Seul épinglé", NewsStatus.published, is_featured=True, position=0
    )
    recent = _news(db_session, "Récent non épinglé", NewsStatus.published)
    r = client.get("/news/featured", params={"limit": 2})
    assert r.status_code == 200
    titles = [n["title"] for n in r.json()]
    assert "Seul épinglé" in titles
    assert recent.title in titles


def test_featured_never_returns_drafts(client, db_session):
    _news(db_session, "Brouillon jamais affiché", NewsStatus.draft, is_featured=True)
    r = client.get("/news/featured")
    titles = [n["title"] for n in r.json()]
    assert "Brouillon jamais affiché" not in titles


# ── CRUD admin ────────────────────────────────────────────────────────────────


def test_create_news_requires_permission(client, make_user, auth_header):
    make_user("creator_news@test.com")
    h = auth_header("creator_news@test.com")
    r = client.post(
        "/news",
        json={"title": "Nouvelle actu", "content": "Contenu", "author": "Auteur"},
        headers=h,
    )
    assert r.status_code == 403


def test_create_update_delete_news(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)

    r = client.post(
        "/news",
        json={
            "title": "Actu créée",
            "content": "Contenu",
            "author": "Auteur",
            "status": "published",
        },
        headers=h,
    )
    assert r.status_code == 201
    news_id = r.json()["id"]

    r = client.patch(
        f"/news/{news_id}", json={"is_featured": True, "position": 5}, headers=h
    )
    assert r.status_code == 200
    assert r.json()["is_featured"] is True
    assert r.json()["position"] == 5

    r = client.delete(f"/news/{news_id}", headers=h)
    assert r.status_code == 204
    assert client.get(f"/news/{news_id}", headers=h).status_code == 404
