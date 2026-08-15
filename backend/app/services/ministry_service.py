from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.ministry_affiliation import MemberMinistryAffiliation
from app.models.parameter import ParameterValue
from app.schemas.ministry_affiliation import MinistryBulkAddResult


def today():
    return datetime.now(timezone.utc).date()


def get_sex_restriction(db: Session, ministry: str) -> str | None:
    return db.scalar(
        select(ParameterValue.restricted_to_sexe).where(
            ParameterValue.category == "ministry",
            ParameterValue.label == ministry,
        )
    )


def check_sex_restriction(member: Member, restriction: str | None) -> None:
    """Refuse l'affiliation (422) si le ministère est restreint à un sexe et
    que celui du membre ne correspond pas exactement — personne, pas même un
    admin, ne peut contourner la restriction."""
    if restriction and member.sexe != restriction:
        raise HTTPException(
            422, f"Ce ministère est réservé aux membres de sexe « {restriction} »."
        )


def validate_sex_restriction(db: Session, member: Member, ministry: str) -> None:
    check_sex_restriction(member, get_sex_restriction(db, ministry))


def bulk_add_members(
    db: Session, ministry: str, member_ids: list[int], scope: list[int] | None
) -> MinistryBulkAddResult:
    """Affilie plusieurs membres d'un coup à un ministère. Un membre hors du
    périmètre, déjà affilié, ou dont le sexe ne correspond pas à une
    restriction du ministère, est ignoré (reporté dans `skipped`) sans faire
    échouer le reste du lot — même un admin ne peut pas contourner la
    restriction."""
    # La restriction de sexe du ministère ne dépend pas du membre : une seule
    # requête pour tout le lot, au lieu d'une par itération.
    restriction = get_sex_restriction(db, ministry)

    # Idem pour les membres eux-mêmes et leurs affiliations actives existantes
    # — un select(...).in_(...) chacun plutôt qu'un aller-retour par membre.
    members_by_id = {
        m.id: m
        for m in db.scalars(select(Member).where(Member.id.in_(member_ids))).all()
    }
    already_active_ids = set(
        db.scalars(
            select(MemberMinistryAffiliation.member_id).where(
                MemberMinistryAffiliation.ministry == ministry,
                MemberMinistryAffiliation.member_id.in_(member_ids),
                MemberMinistryAffiliation.left_at.is_(None),
            )
        ).all()
    )

    added: list[int] = []
    skipped: list[int] = []
    joined_at = today()
    for member_id in member_ids:
        member = members_by_id.get(member_id)
        if not member or (scope is not None and member.church_id not in scope):
            skipped.append(member_id)
            continue
        try:
            check_sex_restriction(member, restriction)
        except HTTPException:
            skipped.append(member_id)
            continue
        # already_active_ids ne reflète que l'état en base avant la boucle :
        # un même id répété dans la requête doit aussi être détecté ici.
        if member_id in already_active_ids:
            skipped.append(member_id)
            continue
        db.add(
            MemberMinistryAffiliation(member_id=member.id, ministry=ministry, joined_at=joined_at)
        )
        added.append(member_id)
        already_active_ids.add(member_id)

    if added:
        db.commit()
    return MinistryBulkAddResult(added=added, skipped=skipped)
