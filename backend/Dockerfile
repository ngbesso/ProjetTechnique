FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Utilisateur non-root pour l'exécution du conteneur (l'installation des
# dépendances ci-dessus reste en root ; seule l'exécution de l'application
# change d'utilisateur). L'app n'écrit rien sur disque à l'exécution (exports
# CSV/Excel/PDF en mémoire, stockage de fichiers sur MinIO/S3) : aucun accès
# en écriture à /app n'est nécessaire au-delà de ce chown initial.
RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app"]
