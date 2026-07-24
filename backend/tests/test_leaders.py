from unittest.mock import MagicMock, patch

from app.models.church import Church
from app.models.leader import Leader
from sqlalchemy import select

BASE = "/api/leaders"


def _fake_storage():
    fake = MagicMock()
    fake.upload_file.return_value = None
    fake.delete_file.return_value = None
    fake.presigned_url.return_value = "http://fake-storage/leaders/photo.jpg"
    return fake


# ── Helpers ────────────────────────────────────────────────────────────────────


def _leader(db_session, first_name="Jean", last_name="Dupont", is_published=True, role="pastor"):
    leader = Leader(
        first_name=first_name,
        last_name=last_name,
        title="Pasteur Principal",
        role=role,
        district="Ouest",
        bio="Une courte biographie.",
        is_published=is_published,
    )
    db_session.add(leader)
    db_session.flush()
    return leader


def _admin_header(make_user, auth_header):
    make_user("admin_leader@test.com", roles=["admin"])
    return auth_header("admin_leader@test.com")


def _payload():
    return {
        "first_name": "Marie",
        "last_name": "Koffi",
        "title": "Pasteure District Est",
        "role": "pastor",
        "district": "Est",
        "bio": "Marie Koffi coordonne les activités évangéliques dans le district Est.",
        "years_of_service": 12,
        "is_published": True,
    }


# ── Liste et détail publics ─────────────────────────────────────────────────────


def test_list_public_only_published(client, db_session):
    _leader(db_session, "Publié", "Un", is_published=True)
    _leader(db_session, "Brouillon", "Deux", is_published=False)

    r = client.get(f"{BASE}/")
    assert r.status_code == 200
    names = [f"{item['first_name']} {item['last_name']}" for item in r.json()["items"]]
    assert "Publié Un" in names
    assert "Brouillon Deux" not in names


def test_list_filters_by_role(client, db_session):
    _leader(db_session, "Le", "Pasteur", role="pastor")
    _leader(db_session, "Le", "Diacre", role="deacon")

    r = client.get(f"{BASE}/?role=deacon")
    assert r.status_code == 200
    names = [f"{item['first_name']} {item['last_name']}" for item in r.json()["items"]]
    assert "Le Diacre" in names
    assert "Le Pasteur" not in names


def test_list_filters_by_district(client, db_session):
    l1 = _leader(db_session, "District", "Ouest")
    l1.district = "Ouest"
    l2 = _leader(db_session, "District", "Est")
    l2.district = "Est"
    db_session.flush()

    r = client.get(f"{BASE}/?district=Est")
    assert r.status_code == 200
    names = [f"{item['first_name']} {item['last_name']}" for item in r.json()["items"]]
    assert "District Est" in names
    assert "District Ouest" not in names


# ── Liste admin ────────────────────────────────────────────────────────────────


def test_admin_list_requires_admin(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("membre_admin_leaders@test.com", church_id)
    r = client.get(f"{BASE}/admin", headers=auth_header("membre_admin_leaders@test.com"))
    assert r.status_code == 403


def test_admin_list_includes_drafts(client, make_user, auth_header, db_session):
    _leader(db_session, "Brouillon", "Admin", is_published=False)
    h = _admin_header(make_user, auth_header)

    r = client.get(f"{BASE}/admin", headers=h)
    assert r.status_code == 200
    names = [f"{item['first_name']} {item['last_name']}" for item in r.json()["items"]]
    assert "Brouillon Admin" in names


def test_get_leader_detail(client, db_session):
    leader = _leader(db_session, "Détail", "Public")
    r = client.get(f"{BASE}/{leader.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["first_name"] == "Détail"
    assert body["photo_url"] is None


def test_get_leader_unpublished_not_found(client, db_session):
    leader = _leader(db_session, "Caché", "Interne", is_published=False)
    r = client.get(f"{BASE}/{leader.id}")
    assert r.status_code == 404


def test_get_leader_not_found(client, db_session):
    r = client.get(f"{BASE}/999999")
    assert r.status_code == 404


# ── Création / modification / suppression (admin) ───────────────────────────────


def test_create_leader_requires_admin(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("membre_leader@test.com", church_id)
    r = client.post(f"{BASE}/", json=_payload(), headers=auth_header("membre_leader@test.com"))
    assert r.status_code == 403


def test_create_leader_as_admin(client, make_user, auth_header, db_session):
    h = _admin_header(make_user, auth_header)
    r = client.post(f"{BASE}/", json=_payload(), headers=h)
    assert r.status_code == 201
    assert r.json()["first_name"] == "Marie"


def test_update_leader_admin_only(client, make_user, auth_header, db_session):
    leader = _leader(db_session, "À", "Modifier")
    h = _admin_header(make_user, auth_header)
    r = client.put(f"{BASE}/{leader.id}", json={"title": "Titre modifié"}, headers=h)
    assert r.status_code == 200
    assert r.json()["title"] == "Titre modifié"


def test_delete_leader_admin_only(client, make_user, auth_header, db_session):
    leader = _leader(db_session, "À", "Supprimer")
    h = _admin_header(make_user, auth_header)
    r = client.delete(f"{BASE}/{leader.id}", headers=h)
    assert r.status_code == 204
    assert db_session.get(Leader, leader.id) is None


def test_delete_leader_requires_auth(client, db_session):
    leader = _leader(db_session, "Non", "Autorisé")
    r = client.delete(f"{BASE}/{leader.id}")
    assert r.status_code == 401


# ── Photo ────────────────────────────────────────────────────────────────────


def test_upload_photo_requires_admin(client, make_member, auth_header, db_session):
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    make_member("photo_member@test.com", church_id)
    leader = _leader(db_session, "Photo", "Test")
    with patch("app.services.leader_service.storage", _fake_storage()):
        r = client.post(
            f"{BASE}/{leader.id}/photo",
            files={"file": ("photo.jpg", b"fake-image-bytes", "image/jpeg")},
            headers=auth_header("photo_member@test.com"),
        )
    assert r.status_code == 403


def test_upload_photo_as_admin(client, make_user, auth_header, db_session):
    leader = _leader(db_session, "Photo", "Admin")
    h = _admin_header(make_user, auth_header)
    fake = _fake_storage()
    # Deux références distinctes à patcher : le service fait l'upload, la
    # route calcule l'URL présignée pour la réponse (_to_read).
    with patch("app.services.leader_service.storage", fake), patch(
        "app.api.routes.leaders.storage", fake
    ):
        r = client.post(
            f"{BASE}/{leader.id}/photo",
            headers=h,
            files={"file": ("photo.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["photo_url"] == "http://fake-storage/leaders/photo.jpg"
    fake.upload_file.assert_called_once()
    args, _kwargs = fake.upload_file.call_args
    assert args[1] == f"leaders/{leader.id}/photo.jpg"
