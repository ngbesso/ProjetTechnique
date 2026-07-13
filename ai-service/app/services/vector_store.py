from dataclasses import dataclass

import numpy as np

from app.services.content_sync import Document


@dataclass
class ScoredDocument:
    document: Document
    score: float


class VectorStore:
    def __init__(self) -> None:
        self._documents: list[Document] = []
        self._embeddings: np.ndarray | None = None

    def load(self, documents: list[Document], embeddings: np.ndarray) -> None:
        self._documents = documents
        self._embeddings = embeddings

    @property
    def size(self) -> int:
        return len(self._documents)

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 4,
        doc_type: str | None = None,
    ) -> list[ScoredDocument]:
        if self._embeddings is None or len(self._documents) == 0:
            return []
        if doc_type is None:
            indices = list(range(len(self._documents)))
        else:
            indices = [i for i, d in enumerate(self._documents) if d.type == doc_type]
        if not indices:
            return []
        scores = self._embeddings[indices] @ query_embedding
        top_local = np.argsort(-scores)[:top_k]
        return [
            ScoredDocument(document=self._documents[indices[i]], score=float(scores[i]))
            for i in top_local
        ]


vector_store = VectorStore()
