import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MemberRequestStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    resolved = "resolved"


class MemberRequest(Base):
    """Demande libre d'un membre à son église (modification de ses informations
    verrouillées, question administrative, etc.) — le canal manquant en face
    des champs de profil en lecture seule."""

    __tablename__ = "member_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    # Valeur libre alimentée par ParameterValue (category="member_request_type").
    request_type: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[MemberRequestStatus] = mapped_column(
        Enum(MemberRequestStatus, native_enum=False, length=20),
        default=MemberRequestStatus.new,
    )
    handled_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None, index=True
    )
    admin_response: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    member = relationship("Member", lazy="select")
    handler = relationship("User", lazy="select")
