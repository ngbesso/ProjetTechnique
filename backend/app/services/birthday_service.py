import calendar
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email import EmailSender, birthday_greeting, render_template
from app.models.member import Member, MemberStatus
from app.models.setting import AppSetting

EASTERN = ZoneInfo("America/Toronto")

DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE = (
    "Bonjour {prenom}, toute l'équipe de Mission Évangélique vous souhaite un "
    "très joyeux anniversaire !"
)
DEFAULT_BIRTHDAY_MONTHLY_MESSAGE_TEMPLATE = (
    "Bonjour {prenom} {nom}, notre communauté célèbre les anniversaires du mois "
    "et voulait vous souhaiter, un peu à l'avance, un très joyeux anniversaire !"
)


def eastern_today() -> date:
    return datetime.now(EASTERN).date()


def _celebration_month_day(birth_month: int, birth_day: int, year: int) -> tuple[int, int]:
    """29 février -> 28 février les années non bissextiles."""
    if birth_month == 2 and birth_day == 29 and not calendar.isleap(year):
        return 2, 28
    return birth_month, birth_day


def _template(db: Session, key: str, default: str) -> str:
    row = db.get(AppSetting, key)
    return row.value if row and row.value else default


def _active_members_with_birth_date(db: Session) -> list[Member]:
    return list(
        db.scalars(
            select(Member).where(
                Member.status == MemberStatus.active,
                Member.birth_date.is_not(None),
            )
        ).all()
    )


def send_daily_birthday_greetings(
    db: Session, sender: EmailSender, today: date | None = None
) -> int:
    """Envoie le message individuel du jour aux membres actifs dont c'est
    l'anniversaire aujourd'hui (heure de l'Est), en évitant tout double envoi
    la même année."""
    today = today or eastern_today()
    template = _template(db, "birthday_message_template", DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE)

    sent = 0
    for member in _active_members_with_birth_date(db):
        if member.last_birthday_greeting_year == today.year:
            continue
        celebration = _celebration_month_day(
            member.birth_date.month, member.birth_date.day, today.year
        )
        if celebration != (today.month, today.day):
            continue
        message = render_template(template, prenom=member.first_name, nom=member.last_name)
        birthday_greeting(sender, member.email, message)
        member.last_birthday_greeting_year = today.year
        sent += 1

    if sent:
        db.commit()
    return sent


def send_monthly_birthday_greetings(db: Session, sender: EmailSender, month: int) -> int:
    """Envoie le message groupé mensuel à tous les membres actifs nés ce mois-ci.
    Mode automatique (le 1er de chaque mois) et manuel (bouton admin) coexistent
    sans restriction — les deux peuvent envoyer pour le même mois."""
    template = _template(
        db, "birthday_monthly_message_template", DEFAULT_BIRTHDAY_MONTHLY_MESSAGE_TEMPLATE
    )

    sent = 0
    for member in _active_members_with_birth_date(db):
        if member.birth_date.month != month:
            continue
        message = render_template(template, prenom=member.first_name, nom=member.last_name)
        birthday_greeting(sender, member.email, message)
        sent += 1
    return sent


def birthdays_today(db: Session, today: date | None = None) -> list[Member]:
    today = today or eastern_today()
    return [
        m
        for m in _active_members_with_birth_date(db)
        if _celebration_month_day(m.birth_date.month, m.birth_date.day, today.year)
        == (today.month, today.day)
    ]


def birthdays_this_month(db: Session, today: date | None = None) -> list[Member]:
    today = today or eastern_today()
    return [m for m in _active_members_with_birth_date(db) if m.birth_date.month == today.month]
