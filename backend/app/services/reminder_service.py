from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email import EmailSender, event_reminder, render_event_message
from app.models.event import Event, EventFormat, EventRegistration, RegistrationStatus
from app.models.setting import AppSetting

MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

_DEFAULT_CANCEL_DEADLINE_HOURS = 24


def _format_date_fr(d: datetime) -> str:
    return f"{d.day} {MONTHS_FR[d.month - 1]} {d.year}"


def _reminder_hours_before(db: Session) -> int:
    setting = db.get(AppSetting, "event_reminder_hours_before")
    try:
        return int(setting.value) if setting else 24
    except (TypeError, ValueError):
        return 24


def _cancel_deadline_hours(event: Event) -> int:
    return (
        event.cancel_deadline_hours
        if event.cancel_deadline_hours is not None
        else _DEFAULT_CANCEL_DEADLINE_HOURS
    )


def send_due_reminders(db: Session, sender: EmailSender) -> int:
    """Envoie un courriel de rappel aux inscrits confirmés dont l'événement démarre
    dans la fenêtre configurée (event_reminder_hours_before), et marque leur
    inscription comme rappelée pour ne jamais l'envoyer deux fois.

    Retourne le nombre de rappels envoyés (utile pour les tests/le monitoring).
    """
    hours = _reminder_hours_before(db)
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=hours)

    rows = db.execute(
        select(EventRegistration, Event)
        .join(Event, Event.id == EventRegistration.event_id)
        .where(
            EventRegistration.status == RegistrationStatus.confirmed,
            EventRegistration.reminder_sent.is_(False),
            Event.date_start >= now,
            Event.date_start <= window_end,
        )
    ).all()

    sent = 0
    for registration, event in rows:
        is_online = event.format in (EventFormat.en_ligne, EventFormat.hybride)
        location_or_link = event.online_link if is_online else event.location
        formatted_date = _format_date_fr(event.date_start)
        custom_message = (
            render_event_message(
                event.reminder_message,
                prenom=registration.first_name,
                titre=event.title,
                date=formatted_date,
                delai=_cancel_deadline_hours(event),
            )
            if event.reminder_message
            else None
        )
        event_reminder(
            sender,
            registration.email,
            registration.first_name,
            event.title,
            formatted_date,
            location_or_link,
            is_online,
            custom_message,
        )
        registration.reminder_sent = True
        sent += 1

    if sent:
        db.commit()
    return sent
