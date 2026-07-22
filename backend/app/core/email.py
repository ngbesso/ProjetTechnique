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


def admin_account_created_invite(sender: EmailSender, to: str, link: str) -> None:
    sender.send(
        to,
        "Un compte administrateur vous a été créé",
        "Bonjour,\n\n"
        "Un compte administrateur vous a été créé sur la plateforme Mission Évangélique.\n"
        f"Définissez votre mot de passe pour y accéder (lien valable 48 h) :\n{link}\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
    )


def render_event_message(template: str, *, prenom: str, titre: str, date: str, delai) -> str:
    """Substitue les variables {prenom}/{titre}/{date}/{delai} dans un message
    personnalisé (confirmation d'inscription / rappel). Utilise un simple
    remplacement (pas str.format) pour ne jamais échouer sur une accolade
    littérale laissée par l'admin dans le texte."""
    result = template
    for key, value in (("prenom", prenom), ("titre", titre), ("date", date), ("delai", delai)):
        result = result.replace(f"{{{key}}}", str(value))
    return result


def event_registration_received(
    sender: EmailSender,
    to: str,
    name: str,
    event_title: str,
    event_date: str,
    location: str | None,
    instructor: str | None,
    price_label: str | None,
    cancel_link: str | None = None,
    online_link: str | None = None,
    custom_message: str | None = None,
) -> None:
    details = [f"  Date      : {event_date}"]
    if location:
        details.append(f"  Lieu      : {location}")
    if instructor:
        details.append(f"  Formateur : {instructor}")
    if price_label:
        details.append(f"  Prix      : {price_label}")
    extra = ""
    if online_link:
        extra += f"\n\nCet événement se déroule en ligne. Lien de connexion :\n{online_link}"
    if cancel_link:
        extra += f"\n\nPour annuler votre inscription :\n{cancel_link}"
    intro = custom_message or (
        f"Bonjour {name},\n\n"
        "Nous avons bien reçu votre inscription à l'événement suivant :"
    )
    sender.send(
        to,
        f"Inscription reçue — {event_title}",
        f"{intro}\n\n"
        f"  Événement : {event_title}\n"
        + "\n".join(details)
        + extra
        + "\n\n"
        "Nous avons hâte de vous y retrouver. Si vous avez des questions, "
        "répondez simplement à ce courriel.\n\n"
        "Fraternellement,\nMission Évangélique",
    )


def event_reminder(
    sender: EmailSender,
    to: str,
    name: str,
    event_title: str,
    event_date: str,
    location_or_link: str | None,
    is_online: bool,
    custom_message: str | None = None,
) -> None:
    where_label = "Lien de connexion" if is_online else "Lieu"
    details = [f"  Date      : {event_date}"]
    if location_or_link:
        details.append(f"  {where_label} : {location_or_link}")
    intro = custom_message or (
        f"Bonjour {name},\n\nPetit rappel : l'événement suivant approche."
    )
    sender.send(
        to,
        f"Rappel — {event_title}",
        f"{intro}\n\n"
        f"  Événement : {event_title}\n"
        + "\n".join(details)
        + "\n\n"
        "Au plaisir de vous y retrouver.\n\n"
        "Fraternellement,\nMission Évangélique",
    )


def prayer_request_received(sender: EmailSender, to: str, member_name: str, message: str) -> None:
    sender.send(
        to,
        "Nouvelle demande de prière",
        f"Une nouvelle demande de prière a été soumise par {member_name}.\n\n"
        f"Message :\n{message}",
    )


def prayer_request_handled(sender: EmailSender, to: str, name: str) -> None:
    sender.send(
        to,
        "Votre demande de prière a été prise en charge",
        f"Bonjour {name}, votre demande de prière a été prise en charge. Merci de votre confiance.",
    )


def volunteer_request_received(
    sender: EmailSender,
    to: str,
    member_name: str,
    event_title: str,
    message: str | None,
) -> None:
    details = f"\n\nMessage :\n{message}" if message else ""
    sender.send(
        to,
        f"Nouvelle demande de bénévolat — {event_title}",
        f"{member_name} souhaite être bénévole pour l'événement « {event_title} »."
        f"{details}",
    )


def volunteer_request_reviewed(
    sender: EmailSender, to: str, name: str, event_title: str, status: str
) -> None:
    if status == "approved":
        sender.send(
            to,
            f"Bénévolat approuvé — {event_title}",
            f"Bonjour {name}, votre demande de bénévolat pour « {event_title} » "
            "a été approuvée. Merci pour votre engagement !",
        )
    else:
        sender.send(
            to,
            f"Bénévolat — {event_title}",
            f"Bonjour {name}, votre demande de bénévolat pour « {event_title} » "
            "n'a pas été retenue cette fois-ci. Merci de votre intérêt.",
        )


def password_reset_email(sender: EmailSender, to: str, link: str) -> None:
    sender.send(
        to,
        "Réinitialisation de votre mot de passe",
        f"Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\n"
        f"Cliquez sur le lien suivant pour choisir un nouveau mot de passe (valable 2 h) :\n{link}\n\n"
        f"Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
    )
