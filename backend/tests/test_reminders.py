"""Tests pour le service de rappels automatiques (app.services.reminder_service)."""

from datetime import datetime, timedelta, timezone

from app.models.event import Event, EventRegistration, EventStatus, RegistrationStatus
from app.services.reminder_service import send_due_reminders


def _event_with_registration(db_session, hours_from_now=2):
    event = Event(
        title="Rappel Test",
        date_start=datetime.now(timezone.utc) + timedelta(hours=hours_from_now),
        status=EventStatus.published,
    )
    db_session.add(event)
    db_session.flush()
    registration = EventRegistration(
        event_id=event.id,
        first_name="Rappel",
        last_name="Test",
        email="reminder@test.com",
        status=RegistrationStatus.confirmed,
    )
    db_session.add(registration)
    db_session.flush()
    return event, registration


def test_reminder_sent_for_registration_within_window(db_session, fake_email):
    _event, registration = _event_with_registration(db_session, hours_from_now=2)

    sent = send_due_reminders(db_session, fake_email)

    assert sent == 1
    assert fake_email.sent
    assert fake_email.sent[0][0] == "reminder@test.com"
    db_session.refresh(registration)
    assert registration.reminder_sent is True


def test_reminder_not_sent_twice_for_same_registration(db_session, fake_email):
    _event_with_registration(db_session, hours_from_now=2)

    first_run = send_due_reminders(db_session, fake_email)
    second_run = send_due_reminders(db_session, fake_email)

    assert first_run == 1
    assert second_run == 0
    assert len(fake_email.sent) == 1


def test_reminder_not_sent_outside_configured_window(db_session, fake_email):
    """Délai par défaut : 24h. Un événement dans 48h n'est pas encore concerné."""
    _event_with_registration(db_session, hours_from_now=48)

    sent = send_due_reminders(db_session, fake_email)

    assert sent == 0
    assert not fake_email.sent


def test_reminder_not_sent_for_cancelled_registration(db_session, fake_email):
    _event, registration = _event_with_registration(db_session, hours_from_now=2)
    registration.status = RegistrationStatus.cancelled
    db_session.flush()

    sent = send_due_reminders(db_session, fake_email)

    assert sent == 0
    assert not fake_email.sent


def test_reminder_not_sent_for_past_event(db_session, fake_email):
    _event_with_registration(db_session, hours_from_now=-1)

    sent = send_due_reminders(db_session, fake_email)

    assert sent == 0
    assert not fake_email.sent


def test_reminder_message_substitution(db_session, fake_email):
    event, _registration = _event_with_registration(db_session, hours_from_now=2)
    event.reminder_message = "Coucou {prenom}, « {titre} » approche ({date}) !"
    db_session.flush()

    send_due_reminders(db_session, fake_email)

    body = fake_email.sent[0][2]
    assert "Coucou Rappel," in body
    assert "Rappel Test" in body
    assert "{prenom}" not in body


def test_reminder_default_message_when_unset(db_session, fake_email):
    event, _registration = _event_with_registration(db_session, hours_from_now=2)
    assert event.reminder_message is None

    send_due_reminders(db_session, fake_email)

    body = fake_email.sent[0][2]
    assert "Petit rappel" in body
