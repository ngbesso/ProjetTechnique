import uuid
from typing import Any

import boto3
from botocore.config import Config

from app.core.config import settings

_client = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.minio_root_user,
    aws_secret_access_key=settings.minio_root_password,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)


def _ensure_bucket() -> None:
    existing = [b["Name"] for b in _client.list_buckets().get("Buckets", [])]
    if settings.s3_bucket not in existing:
        _client.create_bucket(Bucket=settings.s3_bucket)


def _to_public_url(url: str) -> str:
    """Remplace l'URL interne Docker par l'URL publique accessible depuis le navigateur."""
    return url.replace(settings.s3_endpoint_url, settings.minio_public_url)


def generate_upload_url(content_type: str = "audio/mpeg") -> tuple[str, str]:
    """Retourne (url_présignée_upload, fichier_key) pour un PUT direct vers MinIO."""
    _ensure_bucket()
    fichier_key = f"sermons/{uuid.uuid4()}"
    url = _client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": fichier_key,
            "ContentType": content_type,
        },
        ExpiresIn=3600,
    )
    return _to_public_url(url), fichier_key


def generate_stream_url(fichier_key: str, expires_in: int = 3600) -> str:
    url = _client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": fichier_key},
        ExpiresIn=expires_in,
    )
    return _to_public_url(url)


def get_object(fichier_key: str, range_header: str | None = None) -> dict[str, Any]:
    """Récupère un objet MinIO, avec support optionnel du Range (seeking vidéo)."""
    kwargs: dict[str, Any] = {"Bucket": settings.s3_bucket, "Key": fichier_key}
    if range_header:
        kwargs["Range"] = range_header
    return _client.get_object(**kwargs)
