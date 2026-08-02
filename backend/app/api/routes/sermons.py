from datetime import date
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_global_permission
from app.db.session import get_db
from app.models.sermon import Sermon, SermonFormat, SermonStatus
from app.models.user import User
from app.schemas.common import Page
from app.schemas.sermon import (
    SermonAdminStats,
    SermonRead,
    SermonUpdate,
)
from app.services import sermon_service, storage

router = APIRouter(prefix="/sermons", tags=["sermons"])
can_manage = Depends(require_global_permission("sermon:manage"))


def _load(db: Session, sermon_id: int) -> Sermon:
    sermon = sermon_service.get_sermon(db, sermon_id)
    if not sermon:
        raise HTTPException(404, "Sermon introuvable")
    return sermon


def _load_published(db: Session, sermon_id: int) -> Sermon:
    sermon = _load(db, sermon_id)
    if sermon.status != SermonStatus.published:
        raise HTTPException(404, "Sermon introuvable")
    return sermon


def _format_of(file: UploadFile) -> SermonFormat:
    return (
        SermonFormat.video
        if (file.content_type or "").startswith("video")
        else SermonFormat.audio
    )


@router.get("", response_model=Page[SermonRead])
def list_sermons(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    series: str | None = None,
    format: SermonFormat | None = None,
    limit: int = 20,
    offset: int = 0,
):
    rows, total = sermon_service.list_published(
        db, q=q, series=series, format=format, limit=limit, offset=offset
    )
    return Page[SermonRead](items=rows, total=total, limit=limit, offset=offset)


@router.get("/admin", response_model=Page[SermonRead], dependencies=[can_manage])
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
    rows, total = sermon_service.list_all(
        db, q=q, status=status, series=series, format=format, limit=limit, offset=offset
    )
    return Page[SermonRead](items=rows, total=total, limit=limit, offset=offset)


@router.get("/admin/stats", response_model=SermonAdminStats, dependencies=[can_manage])
def get_sermons_stats(db: Annotated[Session, Depends(get_db)]):
    """Publiés/brouillons, total des vues et top 5 des sermons les plus vus."""
    return sermon_service.get_admin_stats(db)


@router.get("/series", response_model=list[str])
def list_series(db: Annotated[Session, Depends(get_db)]):
    """Retourne les noms de séries distincts (sermons publiés uniquement)."""
    return sermon_service.list_series(db)


@router.get("/{sermon_id}", response_model=SermonRead)
def get_sermon(sermon_id: int, db: Annotated[Session, Depends(get_db)]):
    return sermon_service.increment_views(db, _load_published(db, sermon_id))


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
    sermon = sermon_service.create_sermon(
        db,
        title=title,
        preacher=preacher,
        sermon_date=sermon_date,
        description=description,
        series=series,
        format=_format_of(file),
        status=status_,
        uploaded_by=current_user.id,
    )
    # La clé dépend de l'id, disponible seulement après le flush du service.
    file_key = f"sermons/{sermon.id}/{file.filename}"
    storage.upload_file(file.file, file_key, file.content_type)
    return sermon_service.attach_media(db, sermon, file_key=file_key)


@router.patch("/{sermon_id}", response_model=SermonRead, dependencies=[can_manage])
def update_sermon(
    sermon_id: int, data: SermonUpdate, db: Annotated[Session, Depends(get_db)]
):
    return sermon_service.update_sermon(db, _load(db, sermon_id), data)


@router.post("/{sermon_id}/media", response_model=SermonRead, dependencies=[can_manage])
def replace_sermon_media(
    sermon_id: int,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File()],
):
    sermon = _load(db, sermon_id)
    if sermon.file_key:
        storage.delete_file_quiet(sermon.file_key)
    new_key = f"sermons/{sermon.id}/{file.filename}"
    storage.upload_file(file.file, new_key, file.content_type)
    return sermon_service.attach_media(
        db, sermon, file_key=new_key, format=_format_of(file)
    )


@router.delete("/{sermon_id}", status_code=204, dependencies=[can_manage])
def delete_sermon(sermon_id: int, db: Annotated[Session, Depends(get_db)]):
    sermon = _load(db, sermon_id)
    if sermon.file_key:
        storage.delete_file(sermon.file_key)
    sermon_service.delete_sermon(db, sermon)
