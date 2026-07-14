import logging
import smtplib
from typing import Protocol
from email.message import EmailMessage
from app.core.config import settings

logger = logging.getLogger("email")


class SmtpEmailSender:
    """Envoie via un serveur SMTP (Mailpit en dev, SMTP réel en prod)."""

    def __init__(
        self,
        host: str,
        port: int,
        sender: str,
        use_tls: bool = False,
        username: str | None = None,
        password: str | None = None,
    ) -> None:
        self._host = host
        self._port = port
        self._sender = sender
        self._use_tls = use_tls
        self._username = username
        self._password = password

    def send(self, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["From"] = self._sender
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        try:
            with smtplib.SMTP(self._host, self._port, timeout=10) as server:
                if self._use_tls:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                if self._username and self._password:
                    server.login(self._username, self._password)
                server.send_message(msg)
        except OSError as exc:
            logger.warning("Échec d'envoi du courriel à %s : %s", to, exc)


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender:
    """Développement : journalise le courriel au lieu de l'envoyer."""

    def send(self, to: str, subject: str, body: str) -> None:
        logger.info("Courriel -> %s | %s\n%s", to, subject, body)


def get_email_sender() -> EmailSender:
    if settings.email_backend == "smtp":
        return SmtpEmailSender(
            host=settings.smtp_host,
            port=settings.smtp_port,
            sender=settings.email_from,
            use_tls=settings.smtp_use_tls,
            username=settings.smtp_username or None,
            password=settings.smtp_password or None,
        )
    return ConsoleEmailSender()


def membership_received(sender: EmailSender, to: str, name: str) -> None:
    sender.send(
        to,
        "Demande d'adhésion reçue",
        f"Bonjour {name}, nous avons bien reçu votre demande. "
        "Elle sera examinée par un administrateur.",
    )


def membership_approved(sender: EmailSender, to: str, name: str) -> None:
    sender.send(
        to,
        "Adhésion approuvée",
        f"Bonjour {name}, votre adhésion a été approuvée. Bienvenue !",
    )


def membership_approved_invite(sender, to: str, name: str, link: str) -> None:
    sender.send(
        to,
        "Adhésion approuvée — activez votre compte",
        f"Bonjour {name}, votre adhésion a été approuvée. "
        f"Définissez votre mot de passe pour accéder à votre espace (lien valable 48 h) :\n{link}",
    )


def formation_registration_received(
    sender: EmailSender,
    to: str,
    name: str,
    formation_title: str,
    formation_date: str,
    instructor: str,
    price_label: str,
) -> None:
    sender.send(
        to,
        f"Inscription reçue — {formation_title}",
        f"Bonjour {name},\n\n"
        f"Nous avons bien reçu votre inscription à la formation suivante :\n\n"
        f"  Formation : {formation_title}\n"
        f"  Date      : {formation_date}\n"
        f"  Formateur : {instructor}\n"
        f"  Prix      : {price_label}\n\n"
        f"Nous avons hâte de vous y retrouver. Si vous avez des questions, "
        f"répondez simplement à ce courriel.\n\n"
        f"Fraternellement,\nMission Évangélique",
    )


def password_reset_email(sender: EmailSender, to: str, link: str) -> None:
    sender.send(
        to,
        "Réinitialisation de votre mot de passe",
        f"Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\n"
        f"Cliquez sur le lien suivant pour choisir un nouveau mot de passe (valable 2 h) :\n{link}\n\n"
        f"Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
    )
