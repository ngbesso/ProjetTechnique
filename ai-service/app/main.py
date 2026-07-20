import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.services import rag

logger = logging.getLogger(__name__)


async def _periodic_refresh() -> None:
    while True:
        await asyncio.sleep(settings.sync_interval_seconds)
        try:
            await rag.refresh_index()
        except Exception:
            logger.exception("Échec du rafraîchissement périodique de l'index RAG")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await rag.refresh_index()
    except Exception:
        logger.exception("Échec de la construction initiale de l'index RAG")
    task = asyncio.create_task(_periodic_refresh())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Service IA Plateforme OBNL", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"service": "ai-service", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


class ChatRequest(BaseModel):
    question: str


class Source(BaseModel):
    title: str
    type: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    return await rag.answer(payload.question)


@app.post("/refresh")
async def refresh():
    try:
        count = await rag.refresh_index()
    except Exception:
        logger.exception("Échec du rafraîchissement de l'index RAG")
        raise HTTPException(
            status_code=503, detail="Échec du rafraîchissement de l'index"
        )
    return {"documents_indexed": count}
