"""Tests unitaires pour app.core.email — aucune base de données requise."""

import logging
from unittest.mock import MagicMock, patch

from app.core.email import (
    ConsoleEmailSender,
    SmtpEmailSender,
    get_email_sender,
    membership_approved,
    membership_approved_invite,
    membership_received,
)


# ── ConsoleEmailSender ────────────────────────────────────────────────────────


def test_console_sender_logs_message(caplog):
    sender = ConsoleEmailSender()
    with caplog.at_level(logging.INFO, logger="email"):
        sender.send("to@test.com", "Sujet test", "Corps du message")
    assert "to@test.com" in caplog.text
    assert "Sujet test" in caplog.text


def test_console_sender_does_not_raise():
    sender = ConsoleEmailSender()
    sender.send("to@test.com", "S", "B")  # doit passer silencieusement


# ── SmtpEmailSender — envoi de base ──────────────────────────────────────────


def test_smtp_sender_calls_send_message():
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        server = MockSMTP.return_value.__enter__.return_value
        sender = SmtpEmailSender("localhost", 1025, "from@test.com")
        sender.send("to@test.com", "Sujet", "Corps")
        server.send_message.assert_called_once()


def test_smtp_sender_message_headers():
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        captured = {}

        def capture_msg(msg):
            captured["msg"] = msg

        MockSMTP.return_value.__enter__.return_value.send_message.side_effect = (
            capture_msg
        )
        sender = SmtpEmailSender("localhost", 1025, "from@test.com")
        sender.send("to@test.com", "Mon sujet", "Mon corps")
        msg = captured["msg"]
        assert msg["From"] == "from@test.com"
        assert msg["To"] == "to@test.com"
        assert msg["Subject"] == "Mon sujet"


# ── SmtpEmailSender — TLS ─────────────────────────────────────────────────────


def test_smtp_sender_no_tls_by_default():
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        server = MockSMTP.return_value.__enter__.return_value
        sender = SmtpEmailSender("localhost", 1025, "from@test.com", use_tls=False)
        sender.send("to@test.com", "S", "B")
        server.starttls.assert_not_called()


def test_smtp_sender_with_tls():
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        server = MockSMTP.return_value.__enter__.return_value
        sender = SmtpEmailSender("smtp.prod.com", 587, "from@test.com", use_tls=True)
        sender.send("to@test.com", "S", "B")
        server.starttls.assert_called_once()


# ── SmtpEmailSender — authentification ───────────────────────────────────────


def test_smtp_sender_login_called_when_credentials_provided():
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        server = MockSMTP.return_value.__enter__.return_value
        sender = SmtpEmailSender(
            "smtp.prod.com",
            587,
            "from@test.com",
            use_tls=True,
            username="user",
            password="pass",
        )
        sender.send("to@test.com", "S", "B")
        server.login.assert_called_once_with("user", "pass")


def test_smtp_sender_no_login_without_credentials():
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        server = MockSMTP.return_value.__enter__.return_value
        sender = SmtpEmailSender("localhost", 1025, "from@test.com")
        sender.send("to@test.com", "S", "B")
        server.login.assert_not_called()


# ── SmtpEmailSender — résilience réseau ───────────────────────────────────────


def test_smtp_failure_logs_warning_and_does_not_raise(caplog):
    with patch("app.core.email.smtplib.SMTP") as MockSMTP:
        MockSMTP.return_value.__enter__.side_effect = OSError("connexion refusée")
        sender = SmtpEmailSender("unreachable", 1025, "from@test.com")
        with caplog.at_level(logging.WARNING, logger="email"):
            sender.send("to@test.com", "S", "B")  # ne doit pas lever
        assert "to@test.com" in caplog.text


# ── get_email_sender ──────────────────────────────────────────────────────────


def test_get_email_sender_default_returns_smtp():
    sender = get_email_sender()
    assert isinstance(sender, SmtpEmailSender)


def test_get_email_sender_console_backend():
    with patch("app.core.email.settings") as mock_settings:
        mock_settings.email_backend = "console"
        assert isinstance(get_email_sender(), ConsoleEmailSender)


def test_get_email_sender_smtp_backend():
    with patch("app.core.email.settings") as mock_settings:
        mock_settings.email_backend = "smtp"
        mock_settings.smtp_host = "localhost"
        mock_settings.smtp_port = 1025
        mock_settings.smtp_use_tls = False
        mock_settings.smtp_username = ""
        mock_settings.smtp_password = ""
        mock_settings.email_from = "no-reply@test.com"
        sender = get_email_sender()
        assert isinstance(sender, SmtpEmailSender)


# ── helpers fonctionnels ──────────────────────────────────────────────────────


def test_membership_received_sends_correct_subject():
    fake = MagicMock()
    membership_received(fake, "user@b.com", "Marie")
    fake.send.assert_called_once()
    _, subject, _ = fake.send.call_args.args
    assert "adhésion" in subject.lower() or "reçue" in subject.lower()


def test_membership_received_addresses_recipient():
    fake = MagicMock()
    membership_received(fake, "user@b.com", "Marie")
    to, _, body = fake.send.call_args.args
    assert to == "user@b.com"
    assert "Marie" in body


def test_membership_approved_sends_correct_subject():
    fake = MagicMock()
    membership_approved(fake, "user@b.com", "Pierre")
    _, subject, _ = fake.send.call_args.args
    assert "approuvée" in subject.lower() or "adhésion" in subject.lower()


def test_membership_approved_invite_contains_link():
    fake = MagicMock()
    membership_approved_invite(
        fake, "user@b.com", "Paul", "https://example.com/set-pwd?token=xyz"
    )
    _, _, body = fake.send.call_args.args
    assert "https://example.com/set-pwd?token=xyz" in body
    assert "Paul" in body
