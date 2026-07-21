from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member_optional, require_global_permission
from app.db.session import get_db
from app.models.comment import Comment
from app.models.member import Member
from app.models.post import Post, PostStatus
from app.models.setting import AppSetting
from app.schemas.comment import CommentCreate, CommentRead

router = APIRouter(prefix="/posts/{post_id}/comments", tags=["blog"])
can_manage = Depends(require_global_permission("post:manage"))


def _load_published_post(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if not post or post.status != PostStatus.published:
        raise HTTPException(404, "Article introuvable")
    return post


def _comments_mode(db: Session) -> str:
    setting = db.get(AppSetting, "blog_comments_mode")
    return setting.value if setting else "disabled"


@router.get("", response_model=list[CommentRead])
def list_comments(post_id: int, db: Annotated[Session, Depends(get_db)]):
    _load_published_post(db, post_id)
    rows = db.scalars(
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
    ).all()
    return list(rows)


@router.post("", response_model=CommentRead, status_code=201)
def create_comment(
    post_id: int,
    data: CommentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member | None, Depends(get_current_member_optional)],
):
    """Crée un commentaire — visiteur (mode public) ou membre connecté (mode membres/public)."""
    _load_published_post(db, post_id)
    mode = _comments_mode(db)
    if mode == "disabled":
        raise HTTPException(403, "Les commentaires sont désactivés pour ce blog")
    if mode == "members" and current_member is None:
        raise HTTPException(401, "Connexion requise pour commenter cet article")

    if current_member is not None:
        author_name = current_member.full_name
        author_email = current_member.email
    else:
        if not data.author_name or not data.author_email:
            raise HTTPException(422, "Nom et courriel requis pour commenter")
        author_name = data.author_name
        author_email = data.author_email

    comment = Comment(
        post_id=post_id,
        member_id=current_member.id if current_member else None,
        author_name=author_name,
        author_email=author_email,
        content=data.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=204, dependencies=[can_manage])
def delete_comment(
    post_id: int, comment_id: int, db: Annotated[Session, Depends(get_db)]
):
    """Supprime un commentaire — modération, réservé aux gestionnaires du blog."""
    comment = db.get(Comment, comment_id)
    if not comment or comment.post_id != post_id:
        raise HTTPException(404, "Commentaire introuvable")
    db.delete(comment)
    db.commit()
