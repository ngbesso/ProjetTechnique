# Deux modes distincts, choisis via `target:` :
#
#   dev        — utilisé par docker-compose.yml (target: dev). Code monté en
#                volume (./frontend:/app) pour le rechargement à chaud de
#                Vite ; node_modules reste dans le volume anonyme déclaré par
#                docker-compose pour ne pas être écrasé par celui de l'hôte.
#   production — build statique optimisé (npm run build) servi par un petit
#                serveur HTTP. Non utilisé par docker-compose.yml ; à
#                construire explicitement pour un déploiement, ex. :
#                  docker build --target production -t obnl-frontend:prod .
#                  docker run -p 4173:4173 obnl-frontend:prod
#
# Si le conteneur "dev" tournait déjà avant ce changement (utilisateur
# non-root ajouté), le volume anonyme node_modules existant a été créé par
# l'ancienne image en root : `docker compose rm -fsv frontend` avant le
# prochain `up` pour repartir d'un volume propre (node_modules est jetable).

# ── Développement ──────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
USER appuser
COPY --chown=appuser:appgroup package.json ./
RUN npm install
COPY --chown=appuser:appgroup . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Build de production ───────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Service statique de production ────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g serve \
    && addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
USER appuser
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
