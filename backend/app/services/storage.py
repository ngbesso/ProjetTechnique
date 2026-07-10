from typing import BinaryIO

import boto3
from botocore.client import Config

from app.core.config import settings

_client = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.minio_root_user,
    aws_secret_access_key=settings.minio_root_password,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)

# Client dédié aux URLs présignées : utilise l'URL publique directement pour
# que la signature HMAC inclue le bon hostname (le remplacement post-signature
# invalide la signature car le host fait partie des headers signés).
_public_client = boto3.client(
    "s3",
    endpoint_url=settings.s3_public_url,
    aws_access_key_id=settings.minio_root_user,
    aws_secret_access_key=settings.minio_root_password,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)


def ensure_bucket() -> None:
    """Crée le bucket de stockage des sermons s'il n'existe pas déjà."""
    existing = {b["Name"] for b in _client.list_buckets().get("Buckets", [])}
    if settings.s3_bucket not in existing:
        _client.create_bucket(Bucket=settings.s3_bucket)


def upload_file(fileobj: BinaryIO, key: str, content_type: str | None) -> None:
    """Transfère un fichier vers MinIO, côté serveur (le navigateur ne parle qu'à FastAPI)."""
    extra_args = {"ContentType": content_type} if content_type else {}
    _client.upload_fileobj(fileobj, settings.s3_bucket, key, ExtraArgs=extra_args)


def delete_file(key: str) -> None:
    _client.delete_object(Bucket=settings.s3_bucket, Key=key)


def presigned_url(key: str, expires: int = 300) -> str:
    """Génère une URL présignée valide pendant `expires` secondes."""
    return _public_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires,
    )


def get_object(key: str, range_header: str | None = None) -> dict:
    """Lit un objet depuis MinIO côté serveur, pour le proxy-streamer au navigateur (évite CORS)."""
    params = {"Bucket": settings.s3_bucket, "Key": key}
    if range_header:
        params["Range"] = range_header
    return _client.get_object(**params)
