"""Amorçage des réglages sociaux.

L'enjeu n'est pas la création initiale — triviale — mais le rattrapage sur une
base déjà en service : compléter ce qui est resté vide ou de démonstration, sans
jamais écraser ce qu'un administrateur a saisi.
"""

import pytest

from app.models.setting import AppSetting
from app.seed import seed_settings

YOUTUBE_URL = "https://www.youtube.com/@EENOJEC.%C3%89glise/"
INSTAGRAM_URL = "https://www.instagram.com/eenojec/"

DEMO_FACEBOOK = "https://facebook.com/mission"
DEMO_WHATSAPP = "https://wa.me/15145550100"


def _reseed(db):
    """Rejoue l'amorçage, comme au redémarrage du service."""
    seed_settings(db)
    db.flush()


def _value(db, key: str) -> str:
    return db.get(AppSetting, key).value


def _set(db, key: str, value: str) -> None:
    db.get(AppSetting, key).value = value
    db.flush()


def test_cle_absente_est_creee(db_session):
    db_session.delete(db_session.get(AppSetting, "social_youtube_url"))
    db_session.flush()
    assert db_session.get(AppSetting, "social_youtube_url") is None

    _reseed(db_session)

    assert _value(db_session, "social_youtube_url") == YOUTUBE_URL


def test_valeur_vide_est_renseignee(db_session):
    _set(db_session, "social_instagram_url", "")

    _reseed(db_session)

    assert _value(db_session, "social_instagram_url") == INSTAGRAM_URL


def test_valeur_uniquement_composee_d_espaces_est_renseignee(db_session):
    _set(db_session, "social_instagram_url", "   ")

    _reseed(db_session)

    assert _value(db_session, "social_instagram_url") == INSTAGRAM_URL


@pytest.mark.parametrize(
    ("key", "demo_url"),
    [
        ("social_facebook_url", DEMO_FACEBOOK),
        ("social_whatsapp_url", DEMO_WHATSAPP),
    ],
)
def test_lien_de_demonstration_cede_la_place_au_seed(db_session, key, demo_url):
    """Ces deux comptes ne sont pas connus : le seed les remet à vide, ce qui
    masque l'icône plutôt que de mener vers une page inexistante."""
    _set(db_session, key, demo_url)

    _reseed(db_session)

    assert _value(db_session, key) == ""


@pytest.mark.parametrize(
    "key",
    [
        "social_youtube_url",
        "social_facebook_url",
        "social_instagram_url",
        "social_whatsapp_url",
    ],
)
def test_valeur_saisie_par_un_administrateur_reste_intacte(db_session, key):
    _set(db_session, key, "https://exemple.test/compte-du-client")

    _reseed(db_session)

    assert _value(db_session, key) == "https://exemple.test/compte-du-client"


def test_un_reglage_hors_perimetre_social_n_est_pas_rattrape(db_session):
    """Le rattrapage ne vaut que pour les quatre réglages sociaux : ailleurs,
    l'amorçage reste une simple insertion."""
    _set(db_session, "site_name", "")

    _reseed(db_session)

    assert _value(db_session, "site_name") == ""
