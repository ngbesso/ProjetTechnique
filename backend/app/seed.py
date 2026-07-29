from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import DEFAULT_ROLES, PERMISSIONS
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.church import Church
from app.models.donation import Donation
from app.models.donor import Donor
from app.models.event import Event, EventStatus
from app.models.expense import Expense
from app.models.leader import Leader
from app.models.member import Member, MemberStatus
from app.models.menu_item import MenuItem
from app.models.ministry_affiliation import MemberMinistryAffiliation
from app.models.news import News, NewsStatus
from app.models.parameter import ParameterValue
from app.models.post import Post, PostStatus
from app.models.prayer_request import PrayerRequest
from app.models.rbac import Permission, Role, UserRole
from app.models.sermon import Sermon, SermonFormat, SermonStatus
from app.models.setting import AppSetting
from app.models.user import User
from app.models.volunteer_request import VolunteerRequest
from app.services.birthday_service import (
    DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE,
    DEFAULT_BIRTHDAY_MONTHLY_MESSAGE_TEMPLATE,
)

DEFAULT_PARAMETERS: dict[str, list[str]] = {
    "sexe": ["Masculin", "Féminin", "Autre"],
    "family_status": ["Célibataire", "Marié(e)", "Séparé(e)", "Veuf(ve)", "Divorcé(e)"],
    "district": ["Ouest", "Est", "Centre", "Sud", "Outremer"],
    "donation_category": ["Soutien spirituel", "Action communautaire", "Développement"],
    "event_category": ["Conférence", "Colloque", "Croisade", "Retraite", "Formation"],
    "intervenant_category": ["Pasteur", "Conférencier", "Diacre"],
    "leader_role": ["Pasteur", "Ancien", "Diacre", "Responsable de département"],
    "ministry": [
        "Jeunesse",
        "Département des dames",
        "Département des hommes",
        "Chorale",
        "École du dimanche",
        "Évangélisation",
    ],
    "expense_category": [
        "Loyer et charges",
        "Salaires",
        "Entretien et fournitures",
        "Missions et évangélisation",
        "Formation",
        "Autre",
    ],
}

MOTHER_NAME = "Église mère (Mission)"

DEMO_POSTS: list[dict] = [
    dict(
        title="Retour sur notre semaine de prière annuelle",
        excerpt="Plus de 300 membres réunis pour une semaine de jeûne et de prière.",
        content=(
            "Cette année encore, nos Églises affiliées se sont rassemblées pour une "
            "semaine de prière marquée par une forte mobilisation communautaire. "
            "Merci à tous ceux qui ont participé, de près ou de loin, à ce moment "
            "fort de notre vie spirituelle collective."
        ),
        author="Pasteur Marc Lemaire",
        status=PostStatus.published,
        category="Vie communautaire",
    ),
    dict(
        title="Témoignage : une famille transformée par la foi",
        excerpt="L'histoire de la famille Kone, accompagnée par notre mission depuis 2020.",
        content=(
            "Il y a quatre ans, la famille Kone traversait une période difficile. "
            "Aujourd'hui, elle témoigne de la manière dont la communauté et la foi "
            "l'ont aidée à se reconstruire. Un récit d'espoir à lire absolument."
        ),
        author="Pasteure Hélène Bakayoko",
        status=PostStatus.published,
        category="Témoignages",
    ),
    dict(
        title="Nouvelle session de formation des leaders",
        excerpt="Inscriptions ouvertes pour la prochaine cohorte de formation.",
        content=(
            "Nous lançons une nouvelle session de formation destinée aux leaders "
            "de nos Églises affiliées. Au programme : gestion communautaire, "
            "counseling pastoral et développement de projets locaux."
        ),
        author="Pasteur Emmanuel Diallo",
        status=PostStatus.published,
        category="Formation",
    ),
    dict(
        title="Campagne de collecte pour le développement communautaire",
        excerpt="Objectif : soutenir trois nouveaux projets communautaires cette année.",
        content=(
            "La campagne annuelle de collecte au profit du développement "
            "communautaire est lancée. Vos dons permettront de financer des "
            "projets concrets dans les quartiers desservis par nos Églises affiliées."
        ),
        author="Pasteure Pascale Osei",
        status=PostStatus.published,
        category="Annonces",
    ),
    dict(
        title="Brouillon : bilan du trimestre (à finaliser)",
        excerpt="Notes internes en attente de relecture avant publication.",
        content=(
            "Brouillon de bilan trimestriel — statistiques de fréquentation, "
            "dons reçus et nouvelles adhésions. À compléter avant publication."
        ),
        author="Administration",
        status=PostStatus.draft,
        category="Annonces",
    ),
    dict(
        title="Ancien article archivé sur l'inauguration 2023",
        excerpt="Retour sur l'inauguration de notre église mère en 2023.",
        content=(
            "En 2023, notre église mère inaugurait officiellement ses nouveaux "
            "locaux. Cet article, désormais archivé, retrace les temps forts de "
            "cette journée mémorable."
        ),
        author="Pasteur Général André Kouassi",
        status=PostStatus.archived,
        category="Vie communautaire",
    ),
]


DEMO_NEWS: list[dict] = [
    dict(
        title="Ouverture des inscriptions à la convention annuelle",
        excerpt="Réservez votre place pour le plus grand rassemblement de l'année.",
        content=(
            "Les inscriptions à la convention annuelle sont désormais ouvertes. "
            "Rejoignez des milliers de membres de nos Églises affiliées pour trois "
            "jours de louange, de formation et de communion fraternelle."
        ),
        author="Administration",
        status=NewsStatus.published,
        category="Annonces",
        is_featured=True,
        position=0,
    ),
    dict(
        title="Nouveau partenariat pour le développement communautaire",
        excerpt="Un accord signé avec trois organisations locales pour élargir notre impact.",
        content=(
            "Notre mission signe un nouveau partenariat avec trois organisations "
            "locales afin de renforcer les projets de développement communautaire "
            "dans les régions desservies par nos Églises affiliées."
        ),
        author="Pasteure Pascale Osei",
        status=NewsStatus.published,
        category="Partenariats",
        is_featured=True,
        position=1,
    ),
    dict(
        title="Résultats de la collecte de fin d'année",
        excerpt="Grâce à votre générosité, l'objectif de la campagne a été dépassé.",
        content=(
            "La campagne de collecte de fin d'année a dépassé son objectif grâce à "
            "la générosité de nos membres. Merci à toutes les Églises affiliées qui "
            "ont contribué à ce succès collectif."
        ),
        author="Pasteur Marc Lemaire",
        status=NewsStatus.published,
        category="Dons",
    ),
    dict(
        title="Lancement d'un nouveau programme de mentorat des jeunes",
        excerpt="Un accompagnement structuré pour les 15-25 ans dès la rentrée.",
        content=(
            "Un nouveau programme de mentorat destiné aux jeunes de 15 à 25 ans "
            "démarre à la rentrée, avec l'appui de leaders formés dans nos Églises "
            "affiliées."
        ),
        author="Pasteur Emmanuel Diallo",
        status=NewsStatus.published,
        category="Jeunesse",
    ),
]


DEMO_EXPENSES: list[dict] = [
    dict(
        amount=1200.00,
        category="Loyer et charges",
        comment="Loyer mensuel du local principal, incluant électricité et eau.",
    ),
    dict(
        amount=350.50,
        category="Entretien et fournitures",
        comment="Achat de fournitures d'entretien et de matériel de bureau.",
    ),
    dict(
        amount=800.00,
        category="Missions et évangélisation",
        comment="Frais de déplacement et matériel pour la campagne d'évangélisation du district Est.",
    ),
    dict(
        amount=250.00,
        category="Formation",
        comment="Inscription de deux leaders à un séminaire de formation pastorale.",
    ),
]


DEMO_CHURCHES: list[dict] = [
    dict(
        name="Église de la Grâce",
        district="Ouest",
        address="120 rue des Érables, Montréal, QC",
        phone="514-555-0102",
        email="grace@mission-evangelique.org",
        pastor_name="Pasteur David Mensah",
    ),
    dict(
        name="Église du Renouveau",
        district="Est",
        address="45 avenue du Renouveau, Longueuil, QC",
        phone="450-555-0187",
        email="renouveau@mission-evangelique.org",
        pastor_name="Pasteure Chantal N'Diaye",
    ),
]

DEMO_MEMBERS: list[dict] = [
    dict(
        first_name="Jean",
        last_name="Tremblay",
        email="jean.tremblay@example.com",
        sexe="Masculin",
        family_status="Marié(e)",
        is_baptized=True,
        status=MemberStatus.active,
    ),
    dict(
        first_name="Marie-Claire",
        last_name="Fortin",
        email="marieclaire.fortin@example.com",
        sexe="Féminin",
        family_status="Célibataire",
        is_baptized=True,
        status=MemberStatus.active,
    ),
    dict(
        first_name="Samuel",
        last_name="Okafor",
        email="samuel.okafor@example.com",
        sexe="Masculin",
        family_status="Marié(e)",
        is_baptized=True,
        status=MemberStatus.active,
    ),
    dict(
        first_name="Grace",
        last_name="Amoah",
        email="grace.amoah@example.com",
        sexe="Féminin",
        family_status="Célibataire",
        is_baptized=False,
        status=MemberStatus.active,
    ),
    dict(
        first_name="Paul",
        last_name="Bergeron",
        email="paul.bergeron@example.com",
        sexe="Masculin",
        family_status="Marié(e)",
        is_baptized=False,
        status=MemberStatus.pending,
    ),
]

DEMO_LEADERS: list[dict] = [
    dict(
        first_name="David",
        last_name="Mensah",
        title="Pasteur principal",
        role="Pasteur",
        district="Ouest",
        bio="À la tête de l'Église de la Grâce depuis 2015, passionné par le mentorat des jeunes leaders.",
        email="grace@mission-evangelique.org",
        years_of_service=12,
        is_published=True,
        order_index=1,
    ),
    dict(
        first_name="Chantal",
        last_name="N'Diaye",
        title="Pasteure",
        role="Pasteur",
        district="Est",
        bio="Responsable de l'Église du Renouveau, engagée dans l'accompagnement communautaire.",
        email="renouveau@mission-evangelique.org",
        years_of_service=8,
        is_published=True,
        order_index=2,
    ),
]

DEMO_SERMONS: list[dict] = [
    dict(
        title="Marcher par la foi, non par la vue",
        preacher="Pasteur Marc Lemaire",
        description="Une méditation sur la confiance en Dieu au milieu de l'incertitude.",
        series="Fondements de la foi",
        format=SermonFormat.audio,
        file_key="sermons/demo/marcher-par-la-foi.mp3",
        duration_seconds=2280,
        status=SermonStatus.published,
    ),
    dict(
        title="L'amour qui transforme",
        preacher="Pasteure Hélène Bakayoko",
        description="Comment l'amour de Dieu change nos relations et nos communautés.",
        series="Vie de communauté",
        format=SermonFormat.video,
        file_key="sermons/demo/amour-qui-transforme.mp4",
        duration_seconds=3120,
        status=SermonStatus.published,
    ),
    dict(
        title="Servir avec excellence",
        preacher="Pasteur Emmanuel Diallo",
        description="Un appel à servir nos communautés avec intégrité et engagement.",
        series="Leadership et service",
        format=SermonFormat.audio,
        file_key="sermons/demo/servir-avec-excellence.mp3",
        duration_seconds=1980,
        status=SermonStatus.published,
    ),
]

DEMO_EVENTS: list[dict] = [
    dict(
        title="Convention annuelle 2026",
        description="Trois jours de louange, de formation et de communion fraternelle.",
        category="Conférence",
        location="Centre des congrès, Montréal",
        instructor="Pasteur Général André Kouassi",
        status=EventStatus.published,
        days_ahead=30,
    ),
    dict(
        title="Retraite spirituelle du district Est",
        description="Une retraite de ressourcement pour les membres du district Est.",
        category="Retraite",
        location="Centre de retraite Bel-Horizon",
        instructor="Pasteure Chantal N'Diaye",
        status=EventStatus.published,
        days_ahead=45,
    ),
    dict(
        title="Formation des nouveaux leaders (brouillon)",
        description="Session de formation encore en préparation.",
        category="Formation",
        location="À confirmer",
        instructor="Pasteur Emmanuel Diallo",
        status=EventStatus.draft,
        days_ahead=60,
    ),
]

DEMO_DONORS: list[dict] = [
    dict(name="Fondation Lumière", email="dons@fondation-lumiere.org"),
    dict(name="Entreprise Bâtir Ensemble", email="contact@batirensemble.ca"),
]


def seed_roles_permissions(db: Session) -> None:
    """Crée (idempotent) les permissions et les rôles par défaut."""
    perms: dict[str, Permission] = {}
    for code, desc in PERMISSIONS.items():
        p = db.scalar(select(Permission).where(Permission.code == code))
        if p is None:
            p = Permission(code=code, description=desc)
            db.add(p)
        perms[code] = p
    db.flush()
    for name, cfg in DEFAULT_ROLES.items():
        role = db.scalar(select(Role).where(Role.name == name))
        if role is None:
            role = Role(name=name, description=cfg["description"])
            db.add(role)
        role.permissions = [perms[c] for c in cfg["permissions"]]


def ensure_mother_church(db: Session) -> Church:
    """Garantit l'existence de l'unique église mère (parent_id NULL)."""
    mother = db.scalar(select(Church).where(Church.parent_id.is_(None)))
    if mother is None:
        mother = Church(name=MOTHER_NAME)
        db.add(mother)
        db.flush()
    return mother


def seed_admin_user(db: Session) -> None:
    """Crée l'administrateur par défaut s'il n'existe pas et s'assure qu'il a le rôle admin."""
    mother = ensure_mother_church(db)
    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    if not admin_role:
        return

    user = db.scalar(select(User).where(User.email == settings.admin_email))
    if user is None:
        user = User(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
        )
        db.add(user)
        db.flush()
        print(f"[seed] Administrateur créé : {settings.admin_email}")

    # Assigne le rôle admin sur l'église mère si absent
    existing_assignment = db.scalar(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.role_id == admin_role.id,
            UserRole.church_id == mother.id,
        )
    )
    if not existing_assignment:
        db.add(UserRole(user_id=user.id, role_id=admin_role.id, church_id=mother.id))
        print(f"[seed] Rôle admin attribué à : {settings.admin_email}")


def seed_parameters(db: Session) -> None:
    """Insère (idempotent) les valeurs de paramètres par défaut."""
    for category, labels in DEFAULT_PARAMETERS.items():
        for pos, label in enumerate(labels):
            exists = db.scalar(
                select(ParameterValue).where(
                    ParameterValue.category == category,
                    ParameterValue.label == label,
                )
            )
            if exists is None:
                db.add(ParameterValue(category=category, label=label, position=pos))


def seed_settings(db: Session) -> None:
    """Insère (idempotent) les paramètres système par défaut."""
    defaults = {
        "auto_approve_members": "false",
        "zeffy_embed_path": "",
        "event_reminder_hours_before": "24",
        "birthday_message_template": DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE,
        "birthday_monthly_message_template": DEFAULT_BIRTHDAY_MONTHLY_MESSAGE_TEMPLATE,
        "site_name": "Mission Évangélique",
        "site_tagline": "unis dans la foi",
        "site_logo_url": "",
        "hero_eyebrow": "Une famille de foi, au-delà des frontières",
        "hero_title": "Bienvenue dans notre communauté de foi",
        "hero_subtitle": (
            "Des Églises affiliées partout, une mission commune — "
            "servir, former et rayonner ensemble."
        ),
        "about_eyebrow": "Qui sommes-nous",
        "about_title": "Ce qui nous rassemble et nous guide",
        "about_description": (
            "Fondée il y a plus de 40 ans, Mission Évangélique fédère des centaines "
            "d'Églises autour d'une vision commune : faire des disciples dans chaque "
            "communauté et chaque nation."
        ),
        "social_youtube_url": "https://youtube.com/@mission",
        "social_facebook_url": "https://facebook.com/mission",
        "social_instagram_url": "https://instagram.com/mission",
        "social_whatsapp_url": "https://wa.me/15145550100",
    }
    for key, value in defaults.items():
        if db.get(AppSetting, key) is None:
            db.add(AppSetting(key=key, value=value))


def seed_menu_items(db: Session) -> None:
    """Insère (idempotent) les entrées du menu principal par défaut."""
    if db.scalar(select(MenuItem)) is not None:
        return
    defaults = [
        ("Accueil", "home"),
        ("Leadership", "leadership"),
        ("Sermons", "sermons"),
        ("Blog", "blog"),
        ("Actualités", "actualites"),
        ("Événements", "evenements"),
        ("Faire un don", "donation"),
    ]
    for position, (label, target_page) in enumerate(defaults):
        db.add(MenuItem(label=label, target_page=target_page, position=position))


def seed_posts(db: Session) -> None:
    """Insère (idempotent) des articles de blog de démonstration, pour les tests."""
    now = datetime.now(timezone.utc)
    for offset, data in enumerate(DEMO_POSTS):
        exists = db.scalar(select(Post).where(Post.title == data["title"]))
        if exists is None:
            db.add(Post(**data, created_at=now - timedelta(days=offset)))


def seed_news(db: Session) -> None:
    """Insère (idempotent) des actualités de démonstration, pour les tests."""
    now = datetime.now(timezone.utc)
    for offset, data in enumerate(DEMO_NEWS):
        exists = db.scalar(select(News).where(News.title == data["title"]))
        if exists is None:
            db.add(News(**data, created_at=now - timedelta(days=offset)))


def seed_expenses(db: Session) -> None:
    """Insère (idempotent) des dépenses de démonstration, pour les tests."""
    admin = db.scalar(select(User).where(User.email == settings.admin_email))
    if admin is None:
        return
    now = datetime.now(timezone.utc)
    for offset, data in enumerate(DEMO_EXPENSES):
        exists = db.scalar(select(Expense).where(Expense.comment == data["comment"]))
        if exists is None:
            db.add(
                Expense(
                    **data,
                    expense_date=(now - timedelta(days=offset * 3)).date(),
                    responsible_id=admin.id,
                    created_at=now - timedelta(days=offset * 3),
                )
            )


def seed_churches(db: Session) -> None:
    """Insère (idempotent) quelques Églises affiliées de démonstration."""
    mother = ensure_mother_church(db)
    for data in DEMO_CHURCHES:
        exists = db.scalar(select(Church).where(Church.name == data["name"]))
        if exists is None:
            db.add(Church(**data, parent_id=mother.id))
    db.flush()


def seed_members(db: Session) -> None:
    """Insère (idempotent) quelques membres de démonstration, répartis entre
    l'église mère et les Églises affiliées."""
    churches = db.scalars(select(Church).order_by(Church.id)).all()
    if not churches:
        return
    now = datetime.now(timezone.utc)
    for i, data in enumerate(DEMO_MEMBERS):
        exists = db.scalar(select(Member).where(Member.email == data["email"]))
        if exists is None:
            church = churches[i % len(churches)]
            db.add(
                Member(
                    **data,
                    church_id=church.id,
                    created_at=now - timedelta(days=(i + 1) * 5),
                )
            )
    db.flush()


def seed_leaders(db: Session) -> None:
    """Insère (idempotent) quelques membres du leadership de démonstration."""
    churches_by_name = {c.name: c for c in db.scalars(select(Church)).all()}
    for data, church_name in zip(
        DEMO_LEADERS, ("Église de la Grâce", "Église du Renouveau")
    ):
        exists = db.scalar(select(Leader).where(Leader.email == data["email"]))
        if exists is None:
            church = churches_by_name.get(church_name)
            db.add(Leader(**data, church_id=church.id if church else None))


def seed_sermons(db: Session) -> None:
    """Insère (idempotent) quelques sermons de démonstration (fichiers fictifs,
    la lecture audio/vidéo ne fonctionnera pas sans média réel dans MinIO)."""
    now = datetime.now(timezone.utc)
    for offset, data in enumerate(DEMO_SERMONS):
        exists = db.scalar(select(Sermon).where(Sermon.title == data["title"]))
        if exists is None:
            db.add(
                Sermon(
                    **data,
                    sermon_date=(now - timedelta(days=offset * 7)).date(),
                    created_at=now - timedelta(days=offset * 7),
                )
            )


def seed_events(db: Session) -> None:
    """Insère (idempotent) quelques événements de démonstration."""
    now = datetime.now(timezone.utc)
    for data in DEMO_EVENTS:
        payload = dict(data)
        days_ahead = payload.pop("days_ahead")
        exists = db.scalar(select(Event).where(Event.title == payload["title"]))
        if exists is None:
            db.add(Event(**payload, date_start=now + timedelta(days=days_ahead)))


def seed_donors_and_donations(db: Session) -> None:
    """Insère (idempotent) quelques donateurs et dons de démonstration —
    certains liés à un membre, d'autres à un donateur enregistré, un anonyme."""
    for data in DEMO_DONORS:
        exists = db.scalar(select(Donor).where(Donor.name == data["name"]))
        if exists is None:
            db.add(Donor(**data))
    db.flush()

    members = db.scalars(select(Member).order_by(Member.id)).all()
    donors = db.scalars(select(Donor).order_by(Donor.id)).all()
    if not members or not donors:
        return

    now = datetime.now(timezone.utc)
    demo_donations = [
        dict(
            amount=75.00,
            contribution_type="don",
            donor_name=members[0].full_name,
            donor_email=members[0].email,
            member_id=members[0].id,
        ),
        dict(
            amount=200.00,
            contribution_type="dime",
            donor_name=members[1].full_name,
            donor_email=members[1].email,
            member_id=members[1].id,
        ),
        dict(
            amount=500.00,
            contribution_type="don",
            donor_name=donors[0].name,
            donor_email=donors[0].email,
            donor_id=donors[0].id,
        ),
        dict(
            amount=150.00,
            contribution_type="offrande",
            donor_name="Don anonyme",
            donor_email=None,
        ),
    ]
    for offset, data in enumerate(demo_donations):
        exists = db.scalar(
            select(Donation).where(
                Donation.donor_name == data["donor_name"],
                Donation.amount == data["amount"],
            )
        )
        if exists is None:
            db.add(
                Donation(
                    currency="CAD",
                    payment_status="manual",
                    created_at=now - timedelta(days=offset * 4),
                    **data,
                )
            )


def seed_prayer_requests(db: Session) -> None:
    """Insère (idempotent) quelques demandes de prière de démonstration."""
    members = db.scalars(select(Member).order_by(Member.id)).all()
    if len(members) < 2:
        return
    demo = [
        (
            members[0].id,
            "Merci de prier pour la guérison de mon père, hospitalisé cette semaine.",
        ),
        (
            members[1].id,
            "Je demande vos prières pour une décision importante concernant mon emploi.",
        ),
    ]
    for member_id, message in demo:
        exists = db.scalar(
            select(PrayerRequest).where(PrayerRequest.message == message)
        )
        if exists is None:
            db.add(PrayerRequest(member_id=member_id, message=message))


def seed_volunteer_requests(db: Session) -> None:
    """Insère (idempotent) quelques demandes de bénévolat de démonstration."""
    members = db.scalars(select(Member).order_by(Member.id)).all()
    events = db.scalars(select(Event).order_by(Event.id)).all()
    if len(members) < 2 or not events:
        return
    demo = [
        (members[2].id, events[0].id, "Disponible pour l'accueil et l'installation."),
        (
            members[3].id,
            events[0].id,
            "Je peux aider avec la logistique et le transport.",
        ),
    ]
    for member_id, event_id, message in demo:
        exists = db.scalar(
            select(VolunteerRequest).where(
                VolunteerRequest.member_id == member_id,
                VolunteerRequest.event_id == event_id,
            )
        )
        if exists is None:
            db.add(
                VolunteerRequest(
                    member_id=member_id, event_id=event_id, message=message
                )
            )


def seed_ministry_affiliations(db: Session) -> None:
    """Affilie (idempotent) quelques membres de démonstration à des ministères."""
    members = db.scalars(select(Member).order_by(Member.id)).all()
    if len(members) < 3:
        return
    today = datetime.now(timezone.utc).date()
    demo = [
        (members[0].id, "Chorale"),
        (members[1].id, "École du dimanche"),
        (members[2].id, "Jeunesse"),
    ]
    for member_id, ministry in demo:
        exists = db.scalar(
            select(MemberMinistryAffiliation).where(
                MemberMinistryAffiliation.member_id == member_id,
                MemberMinistryAffiliation.ministry == ministry,
            )
        )
        if exists is None:
            db.add(
                MemberMinistryAffiliation(
                    member_id=member_id, ministry=ministry, joined_at=today
                )
            )


def run() -> None:
    db = SessionLocal()
    try:
        seed_roles_permissions(db)
        ensure_mother_church(db)
        seed_admin_user(db)
        seed_parameters(db)
        seed_settings(db)
        seed_menu_items(db)
        seed_posts(db)
        seed_news(db)
        seed_expenses(db)
        seed_churches(db)
        seed_members(db)
        seed_leaders(db)
        seed_sermons(db)
        seed_events(db)
        seed_donors_and_donations(db)
        seed_prayer_requests(db)
        seed_volunteer_requests(db)
        seed_ministry_affiliations(db)
        db.commit()
        print("[seed] Initialisation terminée.")
    finally:
        db.close()


def promote(email: str) -> None:
    """Donne le rôle admin à un utilisateur, porté sur l'église mère (donc partout, en cascade)."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        admin = db.scalar(select(Role).where(Role.name == "admin"))
        mother = ensure_mother_church(db)
        if not user or not admin:
            print("Utilisateur ou rôle admin introuvable.")
            return
        exists = db.scalar(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == admin.id,
                UserRole.church_id == mother.id,
            )
        )
        if not exists:
            db.add(UserRole(user_id=user.id, role_id=admin.id, church_id=mother.id))
        db.commit()
        print(f"{email} est admin sur l'église mère (donc partout).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
