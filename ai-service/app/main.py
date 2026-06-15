from fastapi import FastAPI

app = FastAPI(title="Service IA Plateforme OBNL", version="0.1.0")


@app.get("/")
def root():
    return {"service": "ai-service", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/chat")
def chat(payload: dict):
    # Point d'entrée du chatbot — à implémenter (appel LLM, RAG, etc.)
    question = payload.get("question", "")
    return {"answer": f"(réponse IA à implémenter) — reçu : {question!r}"}
