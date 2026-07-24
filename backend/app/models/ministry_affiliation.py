from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MemberMinistryAffiliation(Base):
    __tablename__ = "member_ministry_affiliations"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    ministry: Mapped[str] = mapped_column(String(100), index=True)
    joined_at: Mapped[date] = mapped_column(Date)
    # null = affiliation active
    left_at: Mapped[date | None] = mapped_column(Date, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    member = relationship("Member", lazy="select")
