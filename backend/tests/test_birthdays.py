"""Tests pour le service d'anniversaires automatisés (app.services.birthday_service)."""

from datetime import date

from sqlalchemy import select

from app.models.church import Church
from app.models.member import Member, MemberStatus
from app.models.setting import AppSetting
from app.services.birthday_service import (
    eastern_today,
    send_daily_birthday_greetings,
    send_monthly_birthday_greetings,
)


def _mother_id(db) -> int:
    return db.scalar(select(Church.id).where(Church.parent_id.is_(None)))


def _member(db_session, birth_date, email="anniv@test.com", status=MemberStatus.active):
    member = Member(
        church_id=_mother_id(db_session),
        first_name="Anna",
        last_name="Versaire",
        email=email,
        birth_date=birth_date,
        status=status,
    )
    db_session.add(member)
    db_session.flush()
    return member


# ── Message individuel du jour ─────────────────────────────────────────────────


def test_daily_greeting_sent_on_matching_day(db_session, fake_email):
    today = date(2026, 7, 24)
    member = _member(db_session, date(1990, 7, 24))

    sent = send_daily_birthday_greetings(db_session, fake_email, today=today)

    assert sent == 1
    assert fake_email.sent[0][0] == member.email
    db_session.refresh(member)
    assert member.last_birthday_greeting_year == 2026


def test_daily_greeting_not_sent_on_other_day(db_session, fake_email):
    _member(db_session, date(1990, 7, 25))

    sent = send_daily_birthday_greetings(db_session, fake_email, today=date(2026, 7, 24))

    assert sent == 0
    assert not fake_email.sent


def test_daily_greeting_not_sent_for_inactive_member(db_session, fake_email):
    _member(db_session, date(1990, 7, 24), status=MemberStatus.pending)

    sent = send_daily_birthday_greetings(db_session, fake_email, today=date(2026, 7, 24))

    assert sent == 0


def test_daily_greeting_sent_only_once_per_year_even_if_job_runs_twice(db_session, fake_email):
    today = date(2026, 7, 24)
    _member(db_session, date(1990, 7, 24))

    first_run = send_daily_birthday_greetings(db_session, fake_email, today=today)
    second_run = send_daily_birthday_greetings(db_session, fake_email, today=today)

    assert first_run == 1
    assert second_run == 0
    assert len(fake_email.sent) == 1


def test_daily_greeting_sent_again_next_year(db_session, fake_email):
    member = _member(db_session, date(1990, 7, 24))
    member.last_birthday_greeting_year = 2025
    db_session.flush()

    sent = send_daily_birthday_greetings(db_session, fake_email, today=date(2026, 7, 24))

    assert sent == 1


def test_daily_greeting_february_29_falls_back_to_28_on_non_leap_year(db_session, fake_email):
    """2026 n'est pas bissextile : un membre né le 29 février reçoit son
    message le 28 février."""
    member = _member(db_session, date(1992, 2, 29))

    sent = send_daily_birthday_greetings(db_session, fake_email, today=date(2026, 2, 28))

    assert sent == 1
    assert fake_email.sent[0][0] == member.email


def test_daily_greeting_february_29_on_leap_year_matches_29_not_28(db_session, fake_email):
    _member(db_session, date(1992, 2, 29))

    sent_on_28 = send_daily_birthday_greetings(db_session, fake_email, today=date(2024, 2, 28))
    sent_on_29 = send_daily_birthday_greetings(db_session, fake_email, today=date(2024, 2, 29))

    assert sent_on_28 == 0
    assert sent_on_29 == 1


def test_daily_greeting_message_substitution(db_session, fake_email):
    setting = db_session.get(AppSetting, "birthday_message_template")
    setting.value = "Bonjour {prenom} {nom}, joyeux anniversaire !"
    db_session.flush()
    _member(db_session, date(1990, 7, 24))

    send_daily_birthday_greetings(db_session, fake_email, today=date(2026, 7, 24))

    body = fake_email.sent[0][2]
    assert body == "Bonjour Anna Versaire, joyeux anniversaire !"


# ── Message groupé mensuel ──────────────────────────────────────────────────────


def test_monthly_greeting_sent_to_members_born_that_month(db_session, fake_email):
    _member(db_session, date(1990, 7, 5), email="a@test.com")
    _member(db_session, date(1985, 7, 30), email="b@test.com")
    _member(db_session, date(1995, 8, 1), email="c@test.com")

    sent = send_monthly_birthday_greetings(db_session, fake_email, month=7)

    assert sent == 2
    recipients = {row[0] for row in fake_email.sent}
    assert recipients == {"a@test.com", "b@test.com"}


def test_monthly_greeting_can_be_sent_multiple_times_same_month(db_session, fake_email):
    """Le job automatique du 1er et le bouton manuel doivent pouvoir
    coexister : aucune restriction anti-doublon sur l'envoi groupé."""
    _member(db_session, date(1990, 7, 5))

    first_run = send_monthly_birthday_greetings(db_session, fake_email, month=7)
    second_run = send_monthly_birthday_greetings(db_session, fake_email, month=7)

    assert first_run == 1
    assert second_run == 1
    assert len(fake_email.sent) == 2


# ── Route admin ──────────────────────────────────────────────────────────────


def test_send_route_requires_global_permission(client, db_session, fake_email, make_user, auth_header):
    _member(db_session, date(1990, 7, 5))
    db_session.commit()
    make_user("organisateur@b.com", roles=["organisateur"])
    header = auth_header("organisateur@b.com")

    r = client.post("/members/admin/birthday-greetings/send?month=7", headers=header)

    assert r.status_code == 403


def test_send_route_sends_for_given_month(client, db_session, fake_email, make_user, auth_header):
    _member(db_session, date(1990, 7, 5))
    db_session.commit()
    make_user("admin@b.com", roles=["admin"])
    header = auth_header("admin@b.com")

    r = client.post("/members/admin/birthday-greetings/send?month=7", headers=header)

    assert r.status_code == 200
    assert r.json()["sent"] == 1


def test_birthdays_overview_route(client, db_session, make_user, auth_header):
    today = eastern_today()
    other_day = 1 if today.day != 1 else 2
    other_month = 1 if today.month != 1 else 2

    m_today = _member(db_session, date(2000, today.month, today.day), email="today@test.com")
    m_month = _member(db_session, date(1985, today.month, other_day), email="month@test.com")
    _member(db_session, date(1985, other_month, 10), email="other@test.com")
    db_session.commit()
    make_user("admin@b.com", roles=["admin"])
    header = auth_header("admin@b.com")

    r = client.get("/members/admin/birthdays", headers=header)

    assert r.status_code == 200
    data = r.json()
    assert {m["id"] for m in data["today"]} == {m_today.id}
    assert {m["id"] for m in data["this_month"]} == {m_today.id, m_month.id}
