# Plateforme OBNL / Mission évangélique

Plateforme numérique modulaire pour la gestion d'une OBNL : membres, Églises
affiliées, dons, événements, sermons, avec un module d'intelligence artificielle.

Projet technique MGL8707 — UQAM.

## Architecture

Monorepo regroupant trois services et l'infrastructure partagée :

| Dossier        | Rôle                              | Stack                         |
|----------------|-----------------------------------|-------------------------------|
| `frontend/`    | Application web (SPA)             | React + TypeScript (Vite)     |
| `backend/`     | API métier REST, auth JWT         | Python · FastAPI              |
| `ai-service/`  | Microservice IA (LLM, RAG)        | Python · FastAPI              |
| infra          | PostgreSQL, Redis, MinIO          | Docker Compose                |

## Prérequis

- Docker et Docker Compose
- (optionnel, pour développer hors conteneur) Node 20+ et Python 3.12+

## Démarrage rapide

```bash
cp .env.example .env        # ajustez les valeurs si besoin
docker compose up --build
```

Services exposés :

- Frontend : http://localhost:5173
- API backend : http://localhost:8000  (docs : http://localhost:8000/docs)
- Service IA : http://localhost:8001  (docs : http://localhost:8001/docs)
- Console MinIO : http://localhost:9001
- PostgreSQL : localhost:5432
- Redis : localhost:6379

## Module IA (chatbot RAG)

Le `ai-service` expose un assistant conversationnel (widget flottant sur le site
public) qui répond aux questions des visiteurs à partir du contenu déjà publié
(articles de blog et sermons), via retrieval-augmented generation :

1. Synchronisation périodique du contenu publié depuis l'API backend (`GET /posts`,
   `GET /sermons`).
2. Indexation vectorielle en mémoire (embeddings `sentence-transformers`, similarité
   cosinus).
3. Recherche des extraits les plus pertinents pour la question posée, puis génération
   de la réponse par un LLM auto-hébergé (Ollama) à partir de ces seuls extraits.

Le LLM tourne dans un conteneur `ollama` du docker-compose (pas de clé API, pas de
coût par requête). Après le premier `docker compose up`, télécharger le modèle une
fois :

```bash
docker compose exec ollama ollama pull llama3.2:3b
```

Configuration (dans `.env`, voir `.env.example`) :

- `OLLAMA_URL` / `OLLAMA_MODEL` — service et modèle Ollama utilisés. Si Ollama est
  injoignable ou le modèle absent, le service répond avec un message dégradé plutôt
  que d'échouer.
- `BACKEND_URL` — URL interne du backend, utilisée par `ai-service` pour récupérer
  le contenu à indexer.

Endpoints principaux (docs complètes : http://localhost:8001/docs) :

- `POST /chat` — pose une question, retourne une réponse et ses sources.
- `POST /refresh` — force une réindexation immédiate du contenu (sinon automatique,
  à intervalle régulier).

## Équipe

| Membre   | Responsabilité principale                                   |
|----------|-------------------------------------------------------------|
| Étud. A  | Auth/JWT, droits d'accès, membres, Églises affiliées        |
| Étud. B  | Dons & paiements, finances, événements + inscription/paiement |
| Étud. C  | Sermons, médias, module IA                                  |

## Contribuer

Voir `CONTRIBUTING.md` pour la stratégie de branches et le workflow.
