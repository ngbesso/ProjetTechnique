from datetime import date
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_global_permission
from app.db.session import get_db
from app.models.sermon import Sermon, SermonFormat, SermonStatus
from app.models.user import User
from app.schemas.sermon import SermonList, SermonRead, SermonUpdate
from app.services import storage

router = APIRouter(prefix="/sermons", tags=["sermons"])
can_manage = Depends(require_global_permission("sermon:manage"))


def _load(db: Session, sermon_id: int) -> Sermon:
    sermon = db.get(Sermon, sermon_id)
    if not sermon:
        raise HTTPException(404, "Sermon introuvable")
    return sermon


def _load_published(db: Session, sermon_id: int) -> Sermon:
    sermon = _load(db, sermon_id)
    if sermon.status != SermonStatus.published:
        raise HTTPException(404, "Sermon introuvable")
    return sermon


@router.get("", response_model=SermonList)
def list_sermons(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    series: str | None = None,
    format: SermonFormat | None = None,
    limit: int = 20,
    offset: int = 0,
):
    query = select(Sermon).where(Sermon.status == SermonStatus.published)
    if q:
        term = f"%{q}%"
        query = query.where(
            Sermon.title.ilike(term)
            | Sermon.preacher.ilike(term)
            | Sermon.series.ilike(term)
            | Sermon.description.ilike(term)
        )
    if series:
        query = query.where(Sermon.series == series)
    if format:
        query = query.where(Sermon.format == format)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(Sermon.sermon_date.desc()).limit(limit).offset(offset)
    ).all()
    return SermonList(items=list(rows), total=total or 0, limit=limit, offset=offset)


@router.get("/admin", response_model=SermonList, dependencies=[can_manage])
def list_sermons_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: SermonStatus | None = None,
    series: str | None = None,
    format: SermonFormat | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """Liste tous les sermons avec filtres — réservé aux gestionnaires."""
    query = select(Sermon)
    if q:
        term = f"%{q}%"
        query = query.where(
            Sermon.title.ilike(term)
            | Sermon.preacher.ilike(term)
            | Sermon.series.ilike(term)
        )
    if status:
        query = query.where(Sermon.status == status)
    if series:
        query = query.where(Sermon.series == series)
    if format:
        query = query.where(Sermon.format == format)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(Sermon.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return SermonList(items=list(rows), total=total or 0, limit=limit, offset=offset)


@router.get("/series", response_model=list[str])
def list_series(db: Annotated[Session, Depends(get_db)]):
    """Retourne les noms de séries distincts (sermons publiés uniquement)."""
    rows = db.scalars(
        select(Sermon.series)
        .where(Sermon.status == SermonStatus.published, Sermon.series.isnot(None))
        .distinct()
        .order_by(Sermon.series)
    ).all()
    return list(rows)


@router.get("/{sermon_id}", response_model=SermonRead)
def get_sermon(sermon_id: int, db: Annotated[Session, Depends(get_db)]):
    sermon = _load_published(db, sermon_id)
    sermon.views += 1
    db.commit()
    db.refresh(sermon)
    return sermon


def _stream_response(sermon: Sermon, request: Request) -> StreamingResponse:
    range_header = request.headers.get("range")
    try:
        obj = storage.get_object(sermon.file_key, range_header)
    except ClientError:
        raise HTTPException(404, "Fichier introuvable") from None

    media_type = "video/mp4" if sermon.format == SermonFormat.video else "audio/mpeg"
    headers = {"Accept-Ranges": "bytes"}
    status_code = 200
    if "ContentRange" in obj:
        headers["Content-Range"] = obj["ContentRange"]
        status_code = 206
    if "ContentLength" in obj:
        headers["Content-Length"] = str(obj["ContentLength"])

    return StreamingResponse(
        obj["Body"].iter_chunks(chunk_size=1024 * 1024),
        status_code=status_code,
        media_type=media_type,
        headers=headers,
    )


@router.get("/{sermon_id}/stream")
def stream_sermon(
    sermon_id: int, request: Request, db: Annotated[Session, Depends(get_db)]
):
    return _stream_response(_load_published(db, sermon_id), request)


@router.get("/{sermon_id}/admin-stream", dependencies=[can_manage])
def stream_sermon_admin(
    sermon_id: int, request: Request, db: Annotated[Session, Depends(get_db)]
):
    """Streaming sans vérification de statut — réservé aux gestionnaires."""
    return _stream_response(_load(db, sermon_id), request)


@router.get("/{sermon_id}/admin-media-url", dependencies=[can_manage])
def get_admin_media_url(sermon_id: int, db: Annotated[Session, Depends(get_db)]):
    """Retourne une URL présignée valide 5 min — évite le problème de header auth dans audio/video."""
    sermon = _load(db, sermon_id)
    if not sermon.file_key:
        raise HTTPException(404, "Aucun fichier associé à ce sermon")
    url = storage.presigned_url(sermon.file_key, expires=300)
    return {"url": url, "format": sermon.format}


@router.post("", response_model=SermonRead, status_code=201, dependencies=[can_manage])
def create_sermon(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    title: Annotated[str, Form()],
    preacher: Annotated[str, Form()],
    sermon_date: Annotated[date, Form()],
    file: Annotated[UploadFile, File()],
    description: Annotated[str | None, Form()] = None,
    series: Annotated[str | None, Form()] = None,
    status_: Annotated[SermonStatus, Form(alias="status")] = SermonStatus.draft,
):
    fmt = (
        SermonFormat.video
        if (file.content_type or "").startswith("video")
        else SermonFormat.audio
    )
    sermon = Sermon(
        title=title,
        preacher=preacher,
        sermon_date=sermon_date,
        description=description,
        series=series,
        format=fmt,
        file_key="",
        status=status_,
        uploaded_by=current_user.id,
    )
    db.add(sermon)
    db.flush()  # obtient sermon.id

    file_key = f"sermons/{sermon.id}/{file.filename}"
    storage.upload_file(file.file, file_key, file.content_type)
    sermon.file_key = file_key

    db.commit()
    db.refresh(sermon)
    return sermon


@router.patch("/{sermon_id}", response_model=SermonRead, dependencies=[can_manage])
def update_sermon(
    sermon_id: int, data: SermonUpdate, db: Annotated[Session, Depends(get_db)]
):
    sermon = _load(db, sermon_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sermon, k, v)
    db.commit()
    db.refresh(sermon)
    return sermon


@router.post("/{sermon_id}/media", response_model=SermonRead, dependencies=[can_manage])
def replace_sermon_media(
    sermon_id: int,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File()],
):
    sermon = _load(db, sermon_id)
    if sermon.file_key:
        try:
            storage.delete_file(sermon.file_key)
        except Exception:
            pass
    fmt = (
        SermonFormat.video
        if (file.content_type or "").startswith("video")
        else SermonFormat.audio
    )
    new_key = f"sermons/{sermon.id}/{file.filename}"
    storage.upload_file(file.file, new_key, file.content_type)
    sermon.file_key = new_key
    sermon.format = fmt
    db.commit()
    db.refresh(sermon)
    return sermon


@router.delete("/{sermon_id}", status_code=204, dependencies=[can_manage])
def delete_sermon(sermon_id: int, db: Annotated[Session, Depends(get_db)]):
    sermon = _load(db, sermon_id)
    if sermon.file_key:
        storage.delete_file(sermon.file_key)
    db.delete(sermon)
    db.commit()
