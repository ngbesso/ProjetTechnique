from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.rbac import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    role_assignments: Mapped[list[UserRole]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )

    @staticmethod
    def _codes(a: UserRole) -> set[str]:
        return {p.code for p in a.role.permissions}

    @property
    def permission_codes(self) -> set[str]:
        """Union de toutes les permissions, tous périmètres confondus (compatibilité ascendante)."""
        return {c for a in self.role_assignments for c in self._codes(a)}

    def has_global_permission(self, code: str) -> bool:
        """Vrai si l'utilisateur détient la permission via un rôle porté sur l'église mère."""
        return any(
            a.church
            and a.church.parent_id is None
            and ("*" in self._codes(a) or code in self._codes(a))
            for a in self.role_assignments
        )

    def has_permission(self, code: str, church_id: int) -> bool:
        """Vrai si l'utilisateur détient la permission sur cette église (ou via la mère, en cascade)."""
        for a in self.role_assignments:
            covers = a.church_id == church_id or (
                a.church and a.church.parent_id is None
            )
            if covers and ("*" in self._codes(a) or code in self._codes(a)):
                return True
        return False

    def accessible_church_ids(self, code: str) -> set[int] | None:
        """Églises où l'utilisateur détient la permission. None = toutes (rôle porté sur la mère)."""
        ids: set[int] = set()
        for a in self.role_assignments:
            if "*" in self._codes(a) or code in self._codes(a):
                if a.church and a.church.parent_id is None:
                    return None
                ids.add(a.church_id)
        return ids
