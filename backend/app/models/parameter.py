from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ParameterValue(Base):
    __tablename__ = "parameter_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Utilisé uniquement par la catégorie "ministry" : restreint l'affiliation
    # à un sexe (valeur de Member.sexe) — null = aucune restriction.
    restricted_to_sexe: Mapped[str | None] = mapped_column(String(20), default=None)
