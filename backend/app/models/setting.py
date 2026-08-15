from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    # Text plutôt que String(500) : les réglages multilignes de la page
    # « Qui sommes-nous » (crédo en 11 points notamment) dépassent largement
    # 500 caractères.
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
