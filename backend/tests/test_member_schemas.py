"""Tests unitaires purs pour les validateurs Pydantic du schéma membre.

Aucune base de données, aucun HTTP — uniquement la logique de validation.
"""

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.member import (
    MemberCreate,
    MemberSelfUpdate,
    MembershipRequest,
    MemberUpdate,
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _base(**kwargs):
    """Champs minimaux pour MembershipRequest."""
    return {
        "church_id": 1,
        "first_name": "X",
        "last_name": "Y",
        "email": "x@b.com",
        "sexe": "Masculin",
        **kwargs,
    }


def _future(days=1) -> date:
    return date.today() + timedelta(days=days)


def _past() -> date:
    return date(2000, 6, 15)


# ── birth_date — MembershipRequest ────────────────────────────────────────────


class TestBirthDateRequest:
    def test_future_raises(self):
        with pytest.raises(ValidationError, match="date de naissance"):
            MembershipRequest(**_base(birth_date=_future()))

    def test_tomorrow_raises(self):
        with pytest.raises(ValidationError):
            MembershipRequest(**_base(birth_date=_future(1)))

    def test_today_raises(self):
        """Le jour même est refusé pour la naissance (mais accepté pour la
        conversion, voir TestConversionDate)."""
        with pytest.raises(ValidationError, match="antérieure à aujourd'hui"):
            MembershipRequest(**_base(birth_date=date.today()))

    def test_yesterday_accepted(self):
        yesterday = date.today() - timedelta(days=1)
        obj = MembershipRequest(**_base(birth_date=yesterday))
        assert obj.birth_date == yesterday

    def test_past_accepted(self):
        obj = MembershipRequest(**_base(birth_date=_past()))
        assert obj.birth_date == _past()

    def test_none_accepted(self):
        obj = MembershipRequest(**_base(birth_date=None))
        assert obj.birth_date is None

    def test_omitted_accepted(self):
        obj = MembershipRequest(**_base())
        assert obj.birth_date is None


# ── birth_date — MemberUpdate ─────────────────────────────────────────────────


class TestBirthDateUpdate:
    def test_future_raises(self):
        with pytest.raises(ValidationError):
            MemberUpdate(birth_date=_future())

    def test_today_raises(self):
        with pytest.raises(ValidationError, match="antérieure à aujourd'hui"):
            MemberUpdate(birth_date=date.today())

    def test_yesterday_accepted(self):
        yesterday = date.today() - timedelta(days=1)
        assert MemberUpdate(birth_date=yesterday).birth_date == yesterday

    def test_none_accepted(self):
        assert MemberUpdate(birth_date=None).birth_date is None


# birth_date n'existe plus sur MemberSelfUpdate : la date de naissance est
# réservée à la gestion administrative (voir TestBirthDateUpdate ci-dessus,
# et test_patch_me_ignores_restricted_fields dans test_members.py).


# ── telephone — MembershipRequest ─────────────────────────────────────────────


class TestTelephoneRequest:
    def test_less_than_7_digits_raises(self):
        with pytest.raises(ValidationError, match="7 chiffres"):
            MembershipRequest(**_base(telephone="12345"))

    def test_exactly_6_digits_raises(self):
        with pytest.raises(ValidationError):
            MembershipRequest(**_base(telephone="123456"))

    def test_exactly_7_digits_accepted(self):
        obj = MembershipRequest(**_base(telephone="1234567"))
        assert obj.telephone == "1234567"

    def test_formatted_phone_accepted(self):
        tel = "+1 (514) 555-0101"
        obj = MembershipRequest(**_base(telephone=tel))
        assert obj.telephone == tel

    def test_international_format_accepted(self):
        obj = MembershipRequest(**_base(telephone="+33 1 23 45 67 89"))
        assert obj.telephone is not None

    def test_non_digit_chars_not_counted(self):
        # "abc-def" = 0 digits → doit échouer
        with pytest.raises(ValidationError):
            MembershipRequest(**_base(telephone="abc-def"))

    def test_letters_rejected_even_with_enough_digits(self):
        # Des lettres ne sont jamais autorisées, même si le nombre de
        # chiffres suffirait par ailleurs.
        with pytest.raises(ValidationError, match="chiffres, espaces, tirets"):
            MembershipRequest(**_base(telephone="514ABC1234"))

    def test_none_accepted(self):
        obj = MembershipRequest(**_base(telephone=None))
        assert obj.telephone is None

    def test_omitted_accepted(self):
        obj = MembershipRequest(**_base())
        assert obj.telephone is None


# ── telephone — MemberUpdate ──────────────────────────────────────────────────


class TestTelephoneUpdate:
    def test_too_short_raises(self):
        with pytest.raises(ValidationError):
            MemberUpdate(telephone="12345")

    def test_valid_accepted(self):
        obj = MemberUpdate(telephone="1234567")
        assert obj.telephone == "1234567"

    def test_none_accepted(self):
        assert MemberUpdate(telephone=None).telephone is None


# ── telephone — MemberSelfUpdate ──────────────────────────────────────────────


class TestTelephoneSelfUpdate:
    def test_too_short_raises(self):
        with pytest.raises(ValidationError):
            MemberSelfUpdate(telephone="99999")

    def test_valid_accepted(self):
        obj = MemberSelfUpdate(telephone="5141234567")
        assert obj.telephone == "5141234567"

    def test_none_accepted(self):
        assert MemberSelfUpdate(telephone=None).telephone is None


# ── conversion_date — MemberCreate ────────────────────────────────────────────


class TestConversionDate:
    def test_future_raises(self):
        with pytest.raises(ValidationError, match="date de conversion"):
            MemberCreate(**_base(conversion_date=_future()))

    def test_today_accepted(self):
        obj = MemberCreate(**_base(conversion_date=date.today()))
        assert obj.conversion_date == date.today()

    def test_past_accepted(self):
        past = date(2015, 3, 10)
        obj = MemberCreate(**_base(conversion_date=past))
        assert obj.conversion_date == past

    def test_none_accepted(self):
        obj = MemberCreate(**_base(conversion_date=None))
        assert obj.conversion_date is None

    def test_omitted_accepted(self):
        obj = MemberCreate(**_base())
        assert obj.conversion_date is None


# ── sexe — champ libre, obligatoire ───────────────────────────────────────────


class TestSexeField:
    def test_sexe_stored_as_is(self):
        obj = MembershipRequest(**_base(sexe="Masculin"))
        assert obj.sexe == "Masculin"

    def test_sexe_none_rejected(self):
        with pytest.raises(ValidationError):
            MembershipRequest(**_base(sexe=None))

    def test_sexe_omitted_rejected(self):
        base = _base()
        del base["sexe"]
        with pytest.raises(ValidationError):
            MembershipRequest(**base)


# ── first_name / last_name — au moins une lettre ──────────────────────────────


class TestNameFields:
    def test_letters_only_accepted(self):
        obj = MembershipRequest(**_base(first_name="Marie", last_name="Curie"))
        assert obj.first_name == "Marie"
        assert obj.last_name == "Curie"

    def test_hyphenated_name_accepted(self):
        obj = MembershipRequest(**_base(first_name="Jean-Pierre"))
        assert obj.first_name == "Jean-Pierre"

    def test_apostrophe_name_accepted(self):
        obj = MembershipRequest(**_base(last_name="O'Brien"))
        assert obj.last_name == "O'Brien"

    def test_accented_letters_accepted(self):
        obj = MembershipRequest(**_base(first_name="Éloïse"))
        assert obj.first_name == "Éloïse"

    def test_name_with_digit_and_letter_accepted(self):
        """Une seule lettre suffit à valider : la règle rejette le tout-numérique,
        pas un caractère numérique isolé au milieu d'un nom."""
        obj = MembershipRequest(**_base(first_name="Jean3"))
        assert obj.first_name == "Jean3"

    def test_purely_numeric_first_name_rejected(self):
        with pytest.raises(ValidationError, match="prénom"):
            MembershipRequest(**_base(first_name="12345"))

    def test_purely_numeric_last_name_rejected(self):
        with pytest.raises(ValidationError, match="nom"):
            MembershipRequest(**_base(last_name="98765"))

    def test_symbols_only_name_rejected(self):
        with pytest.raises(ValidationError):
            MembershipRequest(**_base(first_name="---"))

    def test_member_update_purely_numeric_name_rejected(self):
        with pytest.raises(ValidationError):
            MemberUpdate(first_name="000")

    def test_member_update_none_name_accepted(self):
        """Omis/None reste valide sur une mise à jour partielle : seul un nom
        réellement fourni doit contenir une lettre."""
        assert MemberUpdate(first_name=None).first_name is None


# ── telephone — jeu de caractères ─────────────────────────────────────────────


class TestTelephoneCharacters:
    def test_letters_in_phone_rejected(self):
        with pytest.raises(ValidationError):
            MembershipRequest(**_base(telephone="514ABCDEFG"))

    def test_valid_characters_accepted(self):
        obj = MembershipRequest(**_base(telephone="+1 (514) 555-0101"))
        assert obj.telephone == "+1 (514) 555-0101"
