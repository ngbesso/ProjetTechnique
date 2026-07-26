"""Tests pour l'appartenance des membres aux ministères : auto-affiliation
libre-service (sans validation admin) et gestion admin en masse."""

from datetime import date

from sqlalchemy import select

from app.models.church import Church
from app.models.member import Member, MemberStatus
from app.models.parameter import ParameterValue
from app.models.rbac import Role, UserRole


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _affiliate(client, header, name, district="Est") -> int:
    return client.post(
        "/churches", json={"name": name, "district": district}, headers=header
    ).json()["id"]


def _restrict_ministry(db, ministry: str, sexe: str) -> None:
    """Restreint (dans la transaction du test) une valeur de ministère déjà
    seedée, plutôt que d'en insérer une nouvelle en double."""
    pv = db.scalar(
        select(ParameterValue).where(
            ParameterValue.category == "ministry", ParameterValue.label == ministry
        )
    )
    pv.restricted_to_sexe = sexe
    db.flush()


# ── Libre-service (membre connecté) ───────────────────────────────────────────


def test_join_ministry_requires_auth(client):
    r = client.post("/members/me/ministries", json={"ministry": "Chorale"})
    assert r.status_code == 401


def test_join_ministry_self_service_no_admin_approval(
    client, make_member, auth_header, db_session
):
    """Auto-affiliation immédiate : aucune permission admin requise, seulement
    d'être connecté avec une fiche membre."""
    member = make_member("m1@b.com", _mother_id(db_session))
    db_session.commit()
    h = auth_header("m1@b.com")

    r = client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)

    assert r.status_code == 201
    body = r.json()
    assert body["ministry"] == "Chorale"
    assert body["member_id"] == member.id
    assert body["joined_at"] == date.today().isoformat()
    assert body["left_at"] is None


def test_join_ministry_twice_rejected(client, make_member, auth_header, db_session):
    make_member("m2@b.com", _mother_id(db_session))
    db_session.commit()
    h = auth_header("m2@b.com")
    client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)

    r = client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)

    assert r.status_code == 409


def test_join_ministry_requires_member_profile(client, make_user, auth_header):
    """Un compte sans fiche membre liée ne peut pas s'auto-affilier."""
    make_user("nouser@b.com")
    h = auth_header("nouser@b.com")
    r = client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)
    assert r.status_code == 401


def test_my_ministries_lists_own_affiliations(client, make_member, auth_header, db_session):
    make_member("m3@b.com", _mother_id(db_session))
    db_session.commit()
    h = auth_header("m3@b.com")
    client.post("/members/me/ministries", json={"ministry": "Jeunesse"}, headers=h)
    client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)

    r = client.get("/members/me/ministries", headers=h)

    assert r.status_code == 200
    ministries = {item["ministry"] for item in r.json()}
    assert ministries == {"Jeunesse", "Chorale"}


def test_leave_ministry_sets_left_at_and_keeps_history(
    client, make_member, auth_header, db_session
):
    make_member("m4@b.com", _mother_id(db_session))
    db_session.commit()
    h = auth_header("m4@b.com")
    affiliation_id = client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=h
    ).json()["id"]

    r = client.delete(f"/members/me/ministries/{affiliation_id}", headers=h)

    assert r.status_code == 200
    assert r.json()["left_at"] == date.today().isoformat()

    # La ligne n'est jamais supprimée : elle reste visible dans l'historique.
    history = client.get("/members/me/ministries", headers=h).json()
    assert len(history) == 1
    assert history[0]["id"] == affiliation_id
    assert history[0]["left_at"] == date.today().isoformat()


def test_leave_ministry_wrong_member_404(client, make_member, auth_header, db_session):
    make_member("m5@b.com", _mother_id(db_session))
    make_member("m6@b.com", _mother_id(db_session))
    db_session.commit()
    affiliation_id = client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m5@b.com")
    ).json()["id"]

    r = client.delete(
        f"/members/me/ministries/{affiliation_id}", headers=auth_header("m6@b.com")
    )

    assert r.status_code == 404


# ── Administration : GET /ministries/{ministry}/members ──────────────────────


def test_list_ministry_members_only_active_and_searchable(
    client, make_user, make_member, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    make_member("m7@b.com", _mother_id(db_session))
    make_member("m8@b.com", _mother_id(db_session))
    db_session.commit()
    client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m7@b.com")
    )
    client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m8@b.com")
    )

    r = client.get("/ministries/Chorale/members", headers=h)
    assert r.status_code == 200
    assert {m["email"] for m in r.json()} == {"m7@b.com", "m8@b.com"}

    r_search = client.get("/ministries/Chorale/members?q=m7", headers=h)
    assert r_search.status_code == 200
    assert {m["email"] for m in r_search.json()} == {"m7@b.com"}


# ── Administration : ajout en masse ───────────────────────────────────────────


def test_bulk_add_requires_permission(client, make_user, make_member, auth_header, db_session):
    make_user("organisateur@b.com", roles=["organisateur"])
    h = auth_header("organisateur@b.com")
    member = make_member("m9@b.com", _mother_id(db_session))
    db_session.commit()

    r = client.post(
        "/ministries/Chorale/members", json={"member_ids": [member.id]}, headers=h
    )

    assert r.status_code == 403


def test_bulk_add_affiliates_multiple_members(
    client, make_user, make_member, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    m1 = make_member("m10@b.com", _mother_id(db_session))
    m2 = make_member("m11@b.com", _mother_id(db_session))
    db_session.commit()

    r = client.post(
        "/ministries/Chorale/members",
        json={"member_ids": [m1.id, m2.id]},
        headers=h,
    )

    assert r.status_code == 200
    body = r.json()
    assert set(body["added"]) == {m1.id, m2.id}
    assert body["skipped"] == []

    members = client.get("/ministries/Chorale/members", headers=h).json()
    assert {m["email"] for m in members} == {"m10@b.com", "m11@b.com"}


def test_bulk_add_skips_already_affiliated(
    client, make_user, make_member, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member = make_member("m12@b.com", _mother_id(db_session))
    db_session.commit()
    client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m12@b.com")
    )

    r = client.post(
        "/ministries/Chorale/members", json={"member_ids": [member.id]}, headers=h
    )

    assert r.status_code == 200
    body = r.json()
    assert body["added"] == []
    assert body["skipped"] == [member.id]


def test_bulk_add_duplicate_id_in_same_request_added_once(
    client, make_user, make_member, auth_header, db_session
):
    """Un même id répété dans member_ids ne doit produire qu'une seule
    affiliation — la détection des membres déjà actifs est préchargée une
    fois avant la boucle, elle doit donc aussi suivre les ajouts faits dans
    la même requête."""
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member = make_member("m12dup@b.com", _mother_id(db_session))
    db_session.commit()

    r = client.post(
        "/ministries/Chorale/members",
        json={"member_ids": [member.id, member.id]},
        headers=h,
    )

    assert r.status_code == 200
    body = r.json()
    assert body["added"] == [member.id]
    assert body["skipped"] == [member.id]

    members = client.get("/ministries/Chorale/members", headers=h).json()
    assert len(members) == 1


def test_bulk_add_skips_out_of_scope_members(client, make_user, auth_header, db_session):
    make_user("boss@b.com", roles=["admin"])
    h = auth_header("boss@b.com")
    a = _affiliate(client, h, "Église A", "Ouest")
    b = _affiliate(client, h, "Église B", "Est")
    member_a = Member(
        church_id=a, first_name="A", last_name="Test", email="ma@b.com",
        status=MemberStatus.active,
    )
    member_b = Member(
        church_id=b, first_name="B", last_name="Test", email="mb@b.com",
        status=MemberStatus.active,
    )
    db_session.add_all([member_a, member_b])
    db_session.flush()

    chef = make_user("chef@b.com")
    admin_role = db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(UserRole(user_id=chef.id, role_id=admin_role.id, church_id=a))
    db_session.flush()

    r = client.post(
        "/ministries/Chorale/members",
        json={"member_ids": [member_a.id, member_b.id]},
        headers=auth_header("chef@b.com"),
    )

    assert r.status_code == 200
    body = r.json()
    assert body["added"] == [member_a.id]
    assert body["skipped"] == [member_b.id]


# ── Administration : retrait individuel ───────────────────────────────────────


def test_admin_remove_sets_left_at_and_keeps_history(
    client, make_user, make_member, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member = make_member("m13@b.com", _mother_id(db_session))
    db_session.commit()
    affiliation_id = client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m13@b.com")
    ).json()["id"]

    r = client.delete(f"/members/{member.id}/ministries/{affiliation_id}", headers=h)

    assert r.status_code == 200
    assert r.json()["left_at"] == date.today().isoformat()

    remaining = client.get("/ministries/Chorale/members", headers=h).json()
    assert remaining == []

    # La ligne persiste dans l'historique du membre lui-même.
    own_history = client.get(
        "/members/me/ministries", headers=auth_header("m13@b.com")
    ).json()
    assert len(own_history) == 1
    assert own_history[0]["left_at"] == date.today().isoformat()


def test_admin_remove_requires_permission(
    client, make_user, make_member, auth_header, db_session
):
    make_user("organisateur@b.com", roles=["organisateur"])
    h = auth_header("organisateur@b.com")
    member = make_member("m14@b.com", _mother_id(db_session))
    db_session.commit()
    affiliation_id = client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m14@b.com")
    ).json()["id"]

    r = client.delete(f"/members/{member.id}/ministries/{affiliation_id}", headers=h)

    assert r.status_code == 403


# ── Restriction par sexe ───────────────────────────────────────────────────────


def test_join_ministry_rejected_when_sexe_does_not_match(
    client, make_member, auth_header, db_session
):
    member = make_member("m15@b.com", _mother_id(db_session))
    member.sexe = "Féminin"
    _restrict_ministry(db_session, "Chorale", "Masculin")
    db_session.commit()
    h = auth_header("m15@b.com")

    r = client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)

    assert r.status_code == 422


def test_join_ministry_allowed_when_sexe_matches_restriction(
    client, make_member, auth_header, db_session
):
    member = make_member("m16@b.com", _mother_id(db_session))
    member.sexe = "Masculin"
    _restrict_ministry(db_session, "Chorale", "Masculin")
    db_session.commit()
    h = auth_header("m16@b.com")

    r = client.post("/members/me/ministries", json={"ministry": "Chorale"}, headers=h)

    assert r.status_code == 201


def test_admin_cannot_bypass_sex_restriction_via_bulk_add(
    client, make_user, make_member, auth_header, db_session
):
    """Même un admin ne peut pas contourner une restriction de ministère par
    sexe via l'ajout en masse : le membre concerné est reporté dans skipped,
    aucune affiliation n'est créée pour lui."""
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member = make_member("m17@b.com", _mother_id(db_session))
    member.sexe = "Féminin"
    _restrict_ministry(db_session, "Chorale", "Masculin")
    db_session.commit()

    r = client.post(
        "/ministries/Chorale/members", json={"member_ids": [member.id]}, headers=h
    )

    assert r.status_code == 200
    body = r.json()
    assert body["added"] == []
    assert body["skipped"] == [member.id]

    members = client.get("/ministries/Chorale/members", headers=h).json()
    assert members == []


# ── Administration : historique complet d'un membre ───────────────────────────


def test_admin_member_history_shows_active_and_past(
    client, make_user, make_member, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    member = make_member("m18@b.com", _mother_id(db_session))
    db_session.commit()
    old_id = client.post(
        "/members/me/ministries", json={"ministry": "Jeunesse"}, headers=auth_header("m18@b.com")
    ).json()["id"]
    client.delete(
        f"/members/{member.id}/ministries/{old_id}",
        headers=h,
    )
    client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m18@b.com")
    )

    r = client.get(f"/members/{member.id}/ministries", headers=h)

    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2
    by_ministry = {i["ministry"]: i["left_at"] for i in items}
    assert by_ministry["Jeunesse"] is not None
    assert by_ministry["Chorale"] is None


def test_admin_member_history_requires_permission(
    client, make_user, make_member, auth_header, db_session
):
    make_user("organisateur@b.com", roles=["organisateur"])
    h = auth_header("organisateur@b.com")
    member = make_member("m19@b.com", _mother_id(db_session))
    db_session.commit()

    r = client.get(f"/members/{member.id}/ministries", headers=h)

    assert r.status_code == 403


# ── Administration : rapport (comptes par ministère) ──────────────────────────


def test_ministries_stats_counts_active_members_only(
    client, make_user, make_member, auth_header, db_session
):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    make_member("m20@b.com", _mother_id(db_session))
    make_member("m21@b.com", _mother_id(db_session))
    db_session.commit()
    client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m20@b.com")
    )
    affiliation_id = client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m21@b.com")
    ).json()["id"]
    client.delete(f"/members/me/ministries/{affiliation_id}", headers=auth_header("m21@b.com"))

    r = client.get("/ministries/stats", headers=h)

    assert r.status_code == 200
    by_ministry = {item["ministry"]: item["count"] for item in r.json()}
    assert by_ministry["Chorale"] == 1
    assert by_ministry["Jeunesse"] == 0


def test_ministries_stats_requires_auth(client):
    assert client.get("/ministries/stats").status_code == 401


# ── Administration : export CSV ───────────────────────────────────────────────


def test_export_ministry_members_csv(client, make_user, make_member, auth_header, db_session):
    make_user("admin@b.com", roles=["admin"])
    h = auth_header("admin@b.com")
    make_member("m22@b.com", _mother_id(db_session))
    db_session.commit()
    client.post(
        "/members/me/ministries", json={"ministry": "Chorale"}, headers=auth_header("m22@b.com")
    )

    r = client.get("/ministries/Chorale/members/export", headers=h)

    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    body = r.content.decode("utf-8-sig")
    assert "Prénom,Nom,Courriel,Date d'affiliation" in body
    assert "m22@b.com" in body


def test_export_ministry_members_requires_auth(client):
    assert client.get("/ministries/Chorale/members/export").status_code == 401
