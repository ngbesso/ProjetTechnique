# Architecture

Plateforme en couches, conteneurisée avec Docker.

```
Client (React + TS, SPA)
        |  REST + JWT
        v
Backend FastAPI  <----->  Service IA (Python, LLM + RAG)
        |                         |
        v                         v
PostgreSQL · Redis · MinIO   Base vectorielle · API LLM
```

- **Frontend** : application web monopage.
- **Backend** : API métier REST, authentification JWT, logique des modules
  (membres, Églises, dons, événements).
- **Service IA** : microservice autonome (chatbot, recherche/classification
  de sermons, résumés).
- **Données** : PostgreSQL (relationnel), Redis (cache, files, jetons),
  MinIO (stockage objet S3-compatible pour les médias).

Voir le diagramme détaillé dans le rapport (section Architecture).
