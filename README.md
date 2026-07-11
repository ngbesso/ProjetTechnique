# Plateforme OBNL / Mission évangélique

Plateforme numérique modulaire pour la gestion d'une OBNL : membres, Églises
affiliées, dons, sermons, blog et formations. Un module d'intelligence
artificielle (chatbot) est prévu — le microservice est en place mais pas encore
implémenté.

Projet technique MGL8707 — UQAM.

## Architecture

Monorepo regroupant trois services et l'infrastructure partagée :

| Dossier        | Rôle                              | Stack                         |
|----------------|-----------------------------------|-------------------------------|
| `frontend/`    | Application web (SPA)             | React + TypeScript (Vite)     |
| `backend/`     | API métier REST, auth JWT         | Python · FastAPI              |
| `ai-service/`  | Microservice IA — squelette (LLM/RAG à venir, `/chat` renvoie un stub) | Python · FastAPI |
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
- Service IA : http://localhost:8001  (docs : http://localhost:8001/docs — endpoint `/chat` : stub, implémentation prévue)
- Console MinIO : http://localhost:9001
- PostgreSQL : localhost:5432
- Redis : localhost:6379

## Équipe

| Membre   | Responsabilité principale                                   |
|----------|-------------------------------------------------------------|
| Étud. A  | Auth/JWT, droits d'accès, membres, Églises affiliées        |
| Étud. B  | Dons & paiements, finances, événements + inscription/paiement |
| Étud. C  | Sermons, médias, module IA                                  |

## Contribuer

Voir `CONTRIBUTING.md` pour la stratégie de branches et le workflow.
