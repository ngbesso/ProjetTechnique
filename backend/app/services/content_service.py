from typing import BinaryIO, Generic, TypeVar

from botocore.exceptions import ClientError
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.pagination import paginate
from app.services import storage

ModelT = TypeVar("ModelT")


class ContentService(Generic[ModelT]):
    """Logique CRUD/liste partagée entre les modules de contenu éditorial
    (Actualités, Blog) : mêmes filtres de recherche, mêmes règles de
    publication et le même mécanisme de couverture MinIO. Seuls le modèle,
    son enum de statut et son préfixe de route varient — ce ne sont pas les
    mêmes tables ni les mêmes concepts métier, seulement la même mécanique."""

    def __init__(
        self,
        model: type[ModelT],
        status_enum: type,
        *,
        route_prefix: str,
        not_found_message: str,
    ):
        self.model = model
        self.status_enum = status_enum
        self.route_prefix = route_prefix
        self.cover_key_prefix = f"{route_prefix}/covers"
        self.not_found_message = not_found_message

    def load(self, db: Session, item_id: int) -> ModelT:
        item = db.get(self.model, item_id)
        if not item:
            raise HTTPException(404, self.not_found_message)
        return item

    def load_published(self, db: Session, item_id: int) -> ModelT:
        item = self.load(db, item_id)
        if item.status != self.status_enum.published:
            raise HTTPException(404, self.not_found_message)
        return item

    def _apply_search(self, query, q: str):
        m = self.model
        term = f"%{q}%"
        return query.where(m.title.ilike(term) | m.author.ilike(term) | m.excerpt.ilike(term))

    def list_public(
        self, db: Session, *, q: str | None, category: str | None, limit: int, offset: int
    ) -> tuple[list[ModelT], int]:
        m = self.model
        query = select(m).where(m.status == self.status_enum.published)
        if q:
            query = self._apply_search(query, q)
        if category:
            query = query.where(m.category == category)
        return paginate(db, query.order_by(m.created_at.desc()), limit, offset)

    def list_admin(
        self,
        db: Session,
        *,
        q: str | None,
        category: str | None,
        status: object | None,
        limit: int,
        offset: int,
    ) -> tuple[list[ModelT], int]:
        m = self.model
        query = select(m)
        if q:
            query = self._apply_search(query, q)
        if category:
            query = query.where(m.category == category)
        if status:
            query = query.where(m.status == status)
        return paginate(db, query.order_by(m.created_at.desc()), limit, offset)

    def list_categories(self, db: Session) -> list[str]:
        m = self.model
        rows = db.scalars(
            select(m.category)
            .where(m.status == self.status_enum.published, m.category.isnot(None))
            .distinct()
            .order_by(m.category)
        ).all()
        return list(rows)

    def get_and_increment_views(self, db: Session, item_id: int) -> ModelT:
        item = self.load_published(db, item_id)
        item.views += 1
        db.commit()
        db.refresh(item)
        return item

    def create(self, db: Session, data: BaseModel) -> ModelT:
        item = self.model(**data.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def update(self, db: Session, item: ModelT, data: BaseModel) -> ModelT:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(item, k, v)
        db.commit()
        db.refresh(item)
        return item

    def delete(self, db: Session, item: ModelT) -> None:
        if item.cover_image_url and item.cover_image_url.startswith(f"/{self.route_prefix}/"):
            storage.delete_file_quiet(f"{self.cover_key_prefix}/{item.id}")
        db.delete(item)
        db.commit()

    # ── Couverture ────────────────────────────────────────────────────────────

    def get_cover_object(self, db: Session, item_id: int) -> dict:
        item = self.load(db, item_id)
        if not item.cover_image_url:
            raise HTTPException(404, "Pas de couverture")
        try:
            return storage.get_object(f"{self.cover_key_prefix}/{item_id}")
        except ClientError:
            raise HTTPException(404, "Image introuvable") from None

    def upload_cover(
        self, db: Session, item_id: int, fileobj: BinaryIO, content_type: str
    ) -> ModelT:
        item = self.load(db, item_id)
        storage.upload_file(fileobj, f"{self.cover_key_prefix}/{item_id}", content_type)
        item.cover_image_url = f"/{self.route_prefix}/{item_id}/cover"
        db.commit()
        db.refresh(item)
        return item

    def delete_cover(self, db: Session, item_id: int) -> None:
        item = self.load(db, item_id)
        storage.delete_file_quiet(f"{self.cover_key_prefix}/{item_id}")
        item.cover_image_url = None
        db.commit()
