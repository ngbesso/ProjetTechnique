"""
Script de données de démonstration — présentation MGL8707
Usage : docker exec -it projet_backend python demo_seed.py
"""
from datetime import date, datetime, timezone
from sqlalchemy import select, text

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.church import Church
from app.models.donation import Donation, DonationCategory, DonationCurrency
from app.models.member import Member, MemberStatus
from app.models.rbac import Role, UserRole
from app.models.sermon import Sermon, SermonFormat, SermonStatus
from app.models.user import User
from app.core.config import settings


# ── 1. Données de démonstration ───────────────────────────────────────────────

CHURCHES = [
    dict(name="Église Évangélique de Montréal-Nord",  district="Ouest",   address="145 Rue Fleury E, Montréal, QC H2C 1R4",          phone="514-555-0123", email="montreal.nord@mission.org",  pastor_name="Rev. Jean-Pierre Moreau",    representative="Claudette Beaumont",  founded_on=date(2001, 4, 15)),
    dict(name="Assemblée de la Foi — Laval",           district="Ouest",   address="2550 Boul. des Laurentides, Laval, QC H7K 2L4",    phone="450-555-0456", email="laval@mission.org",           pastor_name="Rev. Samuel Dorilas",        representative="Marie-Ange Pierre",   founded_on=date(2005, 9, 3)),
    dict(name="Église Lumière du Monde — Québec",      district="Centre",  address="180 Rue des Érables, Québec, QC G1R 2B5",          phone="418-555-0789", email="quebec@mission.org",          pastor_name="Rev. Emmanuel Noel",         representative="Josiane Turcotte",    founded_on=date(2008, 2, 20)),
    dict(name="Église Évangélique de Sherbrooke",      district="Est",     address="450 Rue King E, Sherbrooke, QC J1G 1B2",           phone="819-555-0321", email="sherbrooke@mission.org",      pastor_name="Rev. Philippe Beaulieu",     representative="Rose-Marie Chéry",    founded_on=date(2010, 6, 12)),
    dict(name="Mission Chrétienne de Longueuil",       district="Sud",     address="670 Chemin Chambly, Longueuil, QC J4H 3L9",        phone="450-555-0654", email="longueuil@mission.org",       pastor_name="Rev. Wisley Clément",        representative="Sandra Lapierre",     founded_on=date(2013, 11, 8)),
    dict(name="Église Évangélique de la Diaspora",     district="Outremer",address="12 Rue de la Paix, Paris, France 75001",           phone="+33155550987", email="diaspora@mission.org",        pastor_name="Rev. Patrick Desrosiers",    representative="Francine Laguerre",   founded_on=date(2017, 3, 25)),
]

# (prénom, nom, email, mdp, adresse, naissance, sexe, tel, famille, conversion, baptisé, code, église_idx)
MEMBERS_ACTIVE = [
    ("Jean-Pierre",  "Moreau",       "jpm@mission.org",       "Membre1234!", "145 Rue Fleury E, Montréal",          date(1972, 6, 14),  "Masculin", "5145550101", "Marié(e)",   date(1994, 3, 10), True,  "MBR-2024-0001", 0),
    ("Claudette",    "Beaumont",     "cbeaumont@mission.org", "Membre1234!", "220 Rue Prieur E, Montréal",          date(1985, 11, 30), "Féminin",  "5145550102", "Célibataire",date(2005, 7, 22), True,  "MBR-2024-0002", 0),
    ("Gérald",       "Toussaint",    "gtoussaint@mission.org","Membre1234!", "980 Boul. Henri-Bourassa E, Montréal",date(1990, 4, 8),   "Masculin", "5145550103", "Célibataire",date(2012, 1, 15), False, "MBR-2025-0001", 0),
    ("Samuel",       "Dorilas",      "sdorilas@mission.org",  "Membre1234!", "2550 Boul. des Laurentides, Laval",   date(1975, 9, 22),  "Masculin", "4505550201", "Marié(e)",   date(1998, 5, 30), True,  "MBR-2024-0003", 1),
    ("Marie-Ange",   "Pierre",       "mapierre@mission.org",  "Membre1234!", "3100 Boul. Lévesque E, Laval",        date(1980, 2, 14),  "Féminin",  "4505550202", "Mariée",     date(2002, 8, 12), True,  "MBR-2024-0004", 1),
    ("Nadine",       "Fleurant",     "nfleurant@mission.org", "Membre1234!", "1450 Rue Bellefeuille, Laval",        date(1993, 7, 5),   "Féminin",  "4505550203", "Mariée",     date(2015, 4, 20), True,  "MBR-2025-0002", 1),
    ("Emmanuel",     "Noel",         "enoel@mission.org",     "Membre1234!", "180 Rue des Érables, Québec",         date(1968, 12, 3),  "Masculin", "4185550301", "Marié(e)",   date(1989, 11, 8), True,  "MBR-2024-0005", 2),
    ("Josiane",      "Turcotte",     "jturcotte@mission.org", "Membre1234!", "55 Rue Dauphine, Québec",             date(1988, 3, 17),  "Féminin",  "4185550302", "Célibataire",date(2008, 6, 5),  True,  "MBR-2024-0006", 2),
    ("Théodore",     "Pierre-Louis", "tpierre@mission.org",   "Membre1234!", "330 Boul. Charest E, Québec",         date(1995, 8, 21),  "Masculin", "4185550303", "Marié(e)",   date(2018, 2, 14), False, "MBR-2025-0003", 2),
    ("Philippe",     "Beaulieu",     "pbeaulieu@mission.org", "Membre1234!", "450 Rue King E, Sherbrooke",          date(1971, 5, 28),  "Masculin", "8195550401", "Marié(e)",   date(1993, 9, 3),  True,  "MBR-2024-0007", 3),
    ("Rose-Marie",   "Chéry",        "rmchery@mission.org",   "Membre1234!", "88 Rue Dépôt, Sherbrooke",            date(1983, 1, 9),   "Féminin",  "8195550402", "Mariée",     date(2004, 12, 25),True,  "MBR-2024-0008", 3),
    ("Wisley",       "Clément",      "wclement@mission.org",  "Membre1234!", "670 Chemin Chambly, Longueuil",       date(1977, 10, 16), "Masculin", "4505550501", "Marié(e)",   date(1999, 6, 18), True,  "MBR-2024-0009", 4),
    ("Sandra",       "Lapierre",     "slapierre@mission.org", "Membre1234!", "210 Rue Saint-Charles O, Longueuil", date(1992, 6, 25),  "Féminin",  "4505550502", "Célibataire",date(2013, 3, 7),  True,  "MBR-2025-0004", 4),
    ("Patrick",      "Desrosiers",   "pdesrosiers@mission.org","Membre1234!","12 Rue de la Paix, Paris",            date(1965, 7, 4),   "Masculin", "+33144550601","Divorcé(e)", date(1988, 4, 22), True,  "MBR-2024-0010", 5),
    ("Francine",     "Laguerre",     "flaguerre@mission.org", "Membre1234!", "47 Av. Victor Hugo, Paris",           date(1960, 9, 12),  "Féminin",  "+33155550602","Veuf(ve)",   date(1982, 7, 14), True,  "MBR-2024-0011", 5),
]

# (prénom, nom, email, adresse, naissance, sexe, tel, famille, église_idx)
MEMBERS_PENDING = [
    ("Carole",      "Bazin",    "cbazin@mail.com",     "560 Rue Papineau, Montréal",       date(1997, 3, 14), "Féminin",  "5145550901", "Célibataire", 0),
    ("Jean-Claude", "Exantus",  "jcexantus@mail.com",  "35 Rue Saint-Laurent, Longueuil",  date(2000, 8, 5),  "Masculin", "4505550902", "Célibataire", 4),
    ("Martine",     "Dupont",   "mdupont@mail.com",    "125 Rue Wellington S, Sherbrooke",  date(1989, 11, 22),"Féminin",  "8195550903", "Mariée",      3),
]

SERMONS = [
    # Série "Foi & Vie Quotidienne"
    dict(title="La prière comme fondement",         preacher="Rev. Emmanuel Noel",      sermon_date=date(2026, 1, 12), description="Comment la prière quotidienne transforme notre relation avec Dieu et renforce notre foi en toutes circonstances.",  series="Foi & Vie Quotidienne",  format=SermonFormat.audio, file_key="sermons/2026/foi-priere-fondement.mp3",        duration_seconds=3120, status=SermonStatus.published, views=2845),
    dict(title="Vivre selon l'Esprit",              preacher="Rev. Samuel Dorilas",     sermon_date=date(2026, 2, 9),  description="Découvrir ce que signifie être conduit par l'Esprit Saint dans nos choix quotidiens, nos relations et notre service.",series="Foi & Vie Quotidienne",  format=SermonFormat.audio, file_key="sermons/2026/foi-vivre-esprit.mp3",             duration_seconds=2760, status=SermonStatus.published, views=1890),
    dict(title="La foi qui déplace les montagnes", preacher="Rev. Jean-Pierre Moreau", sermon_date=date(2026, 3, 2),  description="Un examen approfondi de Matthieu 17:20 et de ce que signifie vraiment avoir la foi selon les Écritures.",           series="Foi & Vie Quotidienne",  format=SermonFormat.audio, file_key="sermons/2026/foi-deplace-montagnes.mp3",       duration_seconds=2940, status=SermonStatus.published, views=2100),
    # Série "La Grâce de Dieu"
    dict(title="Comprendre la grâce",               preacher="Rev. Philippe Beaulieu",  sermon_date=date(2025, 10, 5), description="Une introduction biblique au concept de la grâce : ce qu'elle est, ce qu'elle n'est pas, et comment la recevoir pleinement.",series="La Grâce de Dieu",     format=SermonFormat.audio, file_key="sermons/2025/grace-comprendre.mp3",             duration_seconds=3300, status=SermonStatus.published, views=3450),
    dict(title="Vivre dans la grâce",               preacher="Rev. Emmanuel Noel",      sermon_date=date(2025, 11, 2), description="Après avoir compris la grâce, comment l'appliquer concrètement dans notre vie de croyant et dans nos relations avec les autres.",series="La Grâce de Dieu",   format=SermonFormat.audio, file_key="sermons/2025/grace-vivre.mp3",                  duration_seconds=3060, status=SermonStatus.published, views=2780),
    dict(title="La grâce qui transforme",           preacher="Rev. Wisley Clément",     sermon_date=date(2025, 12, 7), description="La grâce n'est pas seulement un don reçu une fois, c'est une force transformatrice active dans la vie du croyant.",  series="La Grâce de Dieu",     format=SermonFormat.audio, file_key="sermons/2025/grace-transforme.mp3",             duration_seconds=3240, status=SermonStatus.published, views=2100),
    # Série "Marcher dans la Vérité"
    dict(title="La Parole comme lampe",             preacher="Rev. Patrick Desrosiers", sermon_date=date(2026, 4, 13), description="Psaume 119:105 — Comment lire, méditer et appliquer la Parole de Dieu dans un monde qui offre mille autres lumières.", series="Marcher dans la Vérité", format=SermonFormat.audio, file_key="sermons/2026/verite-parole-lampe.mp3",         duration_seconds=2520, status=SermonStatus.published, views=890),
    dict(title="Témoigner avec intégrité",          preacher="Rev. Samuel Dorilas",     sermon_date=date(2026, 5, 18), description="Comment vivre un témoignage authentique dans notre entourage, au travail et en ligne — sans compromis et sans condescendance.",series="Marcher dans la Vérité",format=SermonFormat.audio, file_key="sermons/2026/verite-temoigner.mp3",             duration_seconds=2700, status=SermonStatus.published, views=1240),
    # Standalones
    dict(title="Message de Pentecôte 2026",         preacher="Rev. Jean-Pierre Moreau", sermon_date=date(2026, 6, 8),  description="Prédication spéciale pour la fête de la Pentecôte : le don de l'Esprit, hier, aujourd'hui et pour toujours.",       series=None,                     format=SermonFormat.video, file_key="sermons/2026/pentecote-2026.mp4",               duration_seconds=4200, status=SermonStatus.published, views=560),
    dict(title="Conférence annuelle — Ouverture",   preacher="Rev. Emmanuel Noel",      sermon_date=date(2026, 7, 1),  description="Culte d'ouverture de la Conférence Annuelle 2026 de la Mission Évangélique. Thème : « Ensemble, jusqu'aux extrémités ».", series=None,                   format=SermonFormat.video, file_key="sermons/2026/conference-ouverture.mp4",          duration_seconds=5400, status=SermonStatus.draft,     views=0),
]


def run():
    db = SessionLocal()
    try:
        print("── Nettoyage des données existantes ──────────────────────────────")
        admin = db.scalar(select(User).where(User.email == settings.admin_email))
        admin_id = admin.id if admin else None

        db.execute(text("DELETE FROM donations"))
        db.execute(text("DELETE FROM sermons"))
        # Membres qui ne sont pas l'admin
        db.execute(text(f"DELETE FROM members WHERE user_id IS NULL OR user_id != {admin_id}"))
        # Users qui ne sont pas l'admin
        db.execute(text(f"DELETE FROM users WHERE id != {admin_id}"))
        # Assignations non-admin
        db.execute(text(f"DELETE FROM user_roles WHERE user_id != {admin_id}"))
        # Églises affiliées (garder la mère)
        db.execute(text("DELETE FROM churches WHERE parent_id IS NOT NULL"))
        db.flush()
        print("  ✓ Données effacées (admin conservé)")

        # ── 2. Églises ──────────────────────────────────────────────────────────
        print("\n── Création des églises affiliées ────────────────────────────────")
        mother = db.scalar(select(Church).where(Church.parent_id.is_(None)))
        church_ids = []
        for c in CHURCHES:
            ch = Church(parent_id=mother.id, **c)
            db.add(ch)
            db.flush()
            church_ids.append(ch.id)
            print(f"  ✓ {ch.name}")

        # ── 3. Membres actifs ────────────────────────────────────────────────
        print("\n── Création des membres actifs ───────────────────────────────────")
        member_role = db.scalar(select(Role).where(Role.name == "membre"))
        member_ids = []
        for (fn, ln, email, pwd, addr, bd, sx, tel, fam, conv, bapt, code, cidx) in MEMBERS_ACTIVE:
            u = User(email=email, hashed_password=hash_password(pwd), is_active=True)
            db.add(u)
            db.flush()
            if member_role:
                db.add(UserRole(user_id=u.id, role_id=member_role.id, church_id=church_ids[cidx]))
            m = Member(
                church_id=church_ids[cidx],
                user_id=u.id,
                first_name=fn, last_name=ln, email=email,
                address=addr, birth_date=bd, sexe=sx, telephone=tel,
                family_status=fam, conversion_date=conv, is_baptized=bapt,
                member_code=code, status=MemberStatus.active,
            )
            db.add(m)
            db.flush()
            member_ids.append(m.id)
            print(f"  ✓ {fn} {ln}  [{code}]")

        # ── 4. Demandes en attente ───────────────────────────────────────────
        print("\n── Création des demandes en attente ──────────────────────────────")
        for (fn, ln, email, addr, bd, sx, tel, fam, cidx) in MEMBERS_PENDING:
            m = Member(
                church_id=church_ids[cidx],
                first_name=fn, last_name=ln, email=email,
                address=addr, birth_date=bd, sexe=sx, telephone=tel,
                family_status=fam, is_baptized=False,
                status=MemberStatus.pending,
            )
            db.add(m)
            db.flush()
            print(f"  ✓ {fn} {ln}  [en attente]")

        # ── 5. Sermons ──────────────────────────────────────────────────────
        print("\n── Création des sermons ──────────────────────────────────────────")
        for s in SERMONS:
            sermon = Sermon(uploaded_by=admin_id, **s)
            db.add(sermon)
            db.flush()
            status_label = "publié" if s["status"] == SermonStatus.published else "brouillon"
            print(f"  ✓ {s['title']}  [{status_label}]")

        # ── 6. Dons ─────────────────────────────────────────────────────────
        print("\n── Création des dons ─────────────────────────────────────────────")
        donations = [
            # (member_idx, church_idx, amount, currency, category, payment_status, donor_name, donor_email, created_at)
            (0,  0, 100.00, "CAD", "soutien_spirituel",   "manual",    None, None, datetime(2026,1,15,10,0,0,tzinfo=timezone.utc)),
            (3,  1, 50.00,  "CAD", "action_communautaire","manual",    None, None, datetime(2026,2,1,14,30,0,tzinfo=timezone.utc)),
            (6,  2, 200.00, "CAD", "developpement",       "manual",    None, None, datetime(2026,2,14,9,15,0,tzinfo=timezone.utc)),
            (9,  3, 75.00,  "CAD", "soutien_spirituel",   "manual",    None, None, datetime(2026,3,5,16,0,0,tzinfo=timezone.utc)),
            (11, 4, 150.00, "CAD", "action_communautaire","manual",    None, None, datetime(2026,3,20,11,0,0,tzinfo=timezone.utc)),
            (13, 5, 300.00, "USD", "developpement",       "manual",    None, None, datetime(2026,4,2,8,45,0,tzinfo=timezone.utc)),
            (1,  0, 25.00,  "CAD", "soutien_spirituel",   "manual",    None, None, datetime(2026,4,10,13,0,0,tzinfo=timezone.utc)),
            (4,  1, 500.00, "CAD", "developpement",       "manual",    None, None, datetime(2026,5,1,10,0,0,tzinfo=timezone.utc)),
            (7,  2, 80.00,  "CAD", "action_communautaire","manual",    None, None, datetime(2026,5,12,15,30,0,tzinfo=timezone.utc)),
            # Dons Zeffy (anonymes)
            (None, 0, 120.00, "CAD", "soutien_spirituel",   "completed", "Marie Dumont",    "mdumont@mail.com",   datetime(2026,5,20,9,0,0,tzinfo=timezone.utc)),
            (None, 2, 250.00, "CAD", "developpement",       "completed", "Robert Tremblay", "rtremblay@mail.com", datetime(2026,6,3,14,0,0,tzinfo=timezone.utc)),
            (None, 4, 75.00,  "CAD", "action_communautaire","completed", "Lucie Grondin",   "lgrondin@mail.com",  datetime(2026,6,15,11,30,0,tzinfo=timezone.utc)),
        ]

        import uuid as _uuid
        for (midx, cidx, amount, currency, category, pstatus, dname, demail, created_at) in donations:
            mid = member_ids[midx] if midx is not None else None
            memail = MEMBERS_ACTIVE[midx][2] if midx is not None else demail
            mname = f"{MEMBERS_ACTIVE[midx][0]} {MEMBERS_ACTIVE[midx][1]}" if midx is not None else dname
            ref = f"ZEFFY-{abs(hash(str(created_at)))}" if pstatus == "completed" else None
            receipt = f"REC-{_uuid.uuid4().hex[:8].upper()}"
            db.execute(text("""
                INSERT INTO donations
                    (receipt_number, amount, currency, category, church_id, member_id,
                     donor_name, donor_email, payment_reference, payment_status, created_at)
                VALUES
                    (:rn, :amt, CAST(:cur AS donationcurrency), CAST(:cat AS donationcategory),
                     :cid, :mid, :dn, :de, :ref, :ps, :ca)
            """), dict(rn=receipt, amt=amount, cur=currency, cat=category,
                       cid=church_ids[cidx], mid=mid, dn=mname, de=memail,
                       ref=ref, ps=pstatus, ca=created_at))
            print(f"  ✓ {amount:.2f} {currency}  — {mname or dname}")

        db.commit()
        print("\n── ✅ Données de démonstration créées avec succès ─────────────────")
        print(f"   Admin     : {settings.admin_email} / {settings.admin_password}")
        print(f"   Membres   : 15 actifs, 3 en attente")
        print(f"   Églises   : 6 affiliées + 1 mère")
        print(f"   Sermons   : 9 publiés, 1 brouillon")
        print(f"   Dons      : 12 (9 manuels, 3 Zeffy)")

    except Exception as e:
        db.rollback()
        print(f"\n✗ Erreur : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
