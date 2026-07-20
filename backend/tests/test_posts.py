from app.models.post import Post, PostStatus


def _post(db_session, title="Titre Test", status=PostStatus.draft, author="Auteur X"):
    p = Post(title=title, content="Contenu", author=author, status=status)
    db_session.add(p)
    db_session.flush()
    return p


def _admin_header(make_user, auth_header):
    make_user("admin_post@test.com", roles=["admin"])
    return auth_header("admin_post@test.com")


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
