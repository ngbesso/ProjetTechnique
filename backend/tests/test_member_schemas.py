"""Tests unitaires purs pour les validateurs Pydantic du schéma membre.

Aucune base de données, aucun HTTP — uniquement la logique de validation.
"""
import pytest
from datetime import date, timedelta
from pydantic import ValidationError

from app.schemas.member import MemberCreate, MembershipRequest, MemberSelfUpdate, MemberUpdate


# ── Helpers ───────────────────────────────────────────────────────────────────

def _base(**kwargs):
    """Champs minimaux pour MembershipRequest."""
    return {"church_id": 1, "first_name": "X", "last_name": "Y", "email": "x@b.com", **kwargs}


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

    def test_today_accepted(self):
        obj = MembershipRequest(**_base(birth_date=date.today()))
        assert obj.birth_date == date.today()

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

    def test_today_accepted(self):
        obj = MemberUpdate(birth_date=date.today())
        assert obj.birth_date == date.today()

    def test_none_accepted(self):
        assert MemberUpdate(birth_date=None).birth_date is None


# ── birth_date — MemberSelfUpdate ─────────────────────────────────────────────


class TestBirthDateSelfUpdate:
    def test_future_raises(self):
        with pytest.raises(ValidationError):
            MemberSelfUpdate(birth_date=_future())

    def test_today_accepted(self):
        obj = MemberSelfUpdate(birth_date=date.today())
        assert obj.birth_date == date.today()

    def test_none_accepted(self):
        assert MemberSelfUpdate(birth_date=None).birth_date is None


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


# ── sexe — champ libre ────────────────────────────────────────────────────────


class TestSexeField:
    def test_sexe_stored_as_is(self):
        obj = MembershipRequest(**_base(sexe="Masculin"))
        assert obj.sexe == "Masculin"

    def test_sexe_none_accepted(self):
        assert MembershipRequest(**_base(sexe=None)).sexe is None

    def test_sexe_omitted_is_none(self):
        assert MembershipRequest(**_base()).sexe is None
