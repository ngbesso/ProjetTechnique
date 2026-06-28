import logging
from typing import Protocol

logger = logging.getLogger("email")


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender:
    """Développement : journalise le courriel au lieu de l'envoyer."""
    def send(self, to: str, subject: str, body: str) -> None:
        logger.info("Courriel -> %s | %s\n%s", to, subject, body)


def get_email_sender() -> EmailSender:
    return ConsoleEmailSender()


def membership_received(sender: EmailSender, to: str, name: str) -> None:
    sender.send(to, "Demande d'adhésion reçue",
                f"Bonjour {name}, nous avons bien reçu votre demande. "
                "Elle sera examinée par un administrateur.")


def membership_approved(sender: EmailSender, to: str, name: str) -> None:
    sender.send(to, "Adhésion approuvée",
                f"Bonjour {name}, votre adhésion a été approuvée. Bienvenue !")