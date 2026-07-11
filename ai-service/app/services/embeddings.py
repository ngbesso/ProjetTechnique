import numpy as np
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed(texts: list[str]) -> np.ndarray:
    """Encode une liste de textes en vecteurs normalisés (produit scalaire = similarité cosinus)."""
    if not texts:
        return np.empty((0, 384), dtype=np.float32)
    return _get_model().encode(texts, normalize_embeddings=True, convert_to_numpy=True)
