import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.crud import sermon as crud
from app.db.session import get_db
from app.models.sermon import StatutSermon
from app.schemas.sermon import (
    SermonCreate,
    SermonListOut,
    SermonOut,
    SermonUpdate,
    UploadUrlResponse,
)
from app.services import storage

router = APIRouter(prefix="/sermons", tags=["sermons"])


# ── Routes publiques ──────────────────────────────────────────────────────────

@router.get("", response_model=SermonListOut)
def list_sermons(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = crud.get_sermons(db, skip=skip, limit=limit)
    return SermonListOut(items=items, total=total, skip=skip, limit=limit)


@router.get("/{sermon_id}", response_model=SermonOut)
def get_sermon(sermon_id: uuid.UUID, db: Session = Depends(get_db)):
    sermon = crud.get_sermon(db, sermon_id)
    if not sermon or sermon.statut == StatutSermon.BROUILLON:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sermon introuvable")
    return sermon


@router.get("/{sermon_id}/stream")
def stream_sermon(
    sermon_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    sermon = crud.get_sermon(db, sermon_id)
    if not sermon or sermon.statut != StatutSermon.PUBLIE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sermon introuvable")
    if not sermon.fichier_key:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fichier non disponible")

    content_type = "video/mp4" if sermon.format.value == "video" else "audio/mpeg"
    range_header = request.headers.get("range")

    try:
        obj = storage.get_object(sermon.fichier_key, range_header)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable dans le stockage")

    crud.increment_vues(db, sermon)

    headers = {"Accept-Ranges": "bytes"}
    if "ContentRange" in obj:
        headers["Content-Range"] = obj["ContentRange"]
    if "ContentLength" in obj:
        headers["Content-Length"] = str(obj["ContentLength"])

    status_code = 206 if range_header else 200
    return StreamingResponse(obj["Body"], status_code=status_code, media_type=content_type, headers=headers)


@router.get("/{sermon_id}/stream-url")
def get_stream_url(sermon_id: uuid.UUID, db: Session = Depends(get_db)):
    sermon = crud.get_sermon(db, sermon_id)
    if not sermon or sermon.statut != StatutSermon.PUBLIE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sermon introuvable")
    if not sermon.fichier_key:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fichier audio non encore uploadé")
    crud.increment_vues(db, sermon)
    url = storage.generate_stream_url(sermon.fichier_key)
    return {"stream_url": url, "format": sermon.format, "duree_secondes": sermon.duree_secondes}


# ── Routes admin (protection JWT à brancher plus tard) ───────────────────────

@router.post("/upload-url", response_model=UploadUrlResponse, status_code=status.HTTP_200_OK)
def get_upload_url(content_type: str = Query("audio/mpeg")):
    url, fichier_key = storage.generate_upload_url(content_type=content_type)
    return UploadUrlResponse(upload_url=url, fichier_key=fichier_key)


@router.post("", response_model=SermonOut, status_code=status.HTTP_201_CREATED)
def create_sermon(sermon_in: SermonCreate, db: Session = Depends(get_db)):
    return crud.create_sermon(db, sermon_in)


@router.put("/{sermon_id}", response_model=SermonOut)
def update_sermon(
    sermon_id: uuid.UUID, sermon_in: SermonUpdate, db: Session = Depends(get_db)
):
    sermon = crud.get_sermon(db, sermon_id)
    if not sermon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sermon introuvable")
    return crud.update_sermon(db, sermon, sermon_in)


@router.delete("/{sermon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sermon(sermon_id: uuid.UUID, db: Session = Depends(get_db)):
    sermon = crud.get_sermon(db, sermon_id)
    if not sermon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sermon introuvable")
    crud.archive_sermon(db, sermon)
