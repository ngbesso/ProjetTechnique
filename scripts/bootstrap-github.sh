#!/usr/bin/env bash
# Configure les sprints du projet sur GitHub : labels, milestones (Sprint 1 & 2)
# et issues (user stories) à partir du carnet de produit.
#
# Prérequis :
#   - GitHub CLI installé et authentifié :  gh auth login
#   - Exécuter ce script DEPUIS le dépôt cloné (le dépôt doit déjà exister sur GitHub)
#
# Usage :  bash scripts/bootstrap-github.sh
set -euo pipefail

echo "==> Dépôt cible : $(gh repo view --json nameWithOwner -q .nameWithOwner)"

# --- Labels ---
echo "==> Création des labels"
create_label() { gh label create "$1" --color "$2" --description "$3" 2>/dev/null || true; }
create_label "user-story" "1d76db" "Besoin exprimé côté utilisateur"
create_label "bug"        "d73a4a" "Comportement inattendu"
create_label "backend"    "0e8a16" "Service FastAPI"
create_label "frontend"   "5319e7" "Application React"
create_label "ia"         "d93f0b" "Module intelligence artificielle"
create_label "infra"      "fbca04" "Docker, CI/CD, base de données"

# --- Milestones (sprints) ---
echo "==> Création des milestones"
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
create_milestone() {
  gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null 2>&1 || true
}
create_milestone "Sprint 1" "Fondations : accueil, comptes, membres, premiers dons"
create_milestone "Sprint 2" "Sermons et dons en ligne"

# --- Helper création d'issue ---
new_issue() {
  local title="$1"; local milestone="$2"; local labels="$3"; local body="$4"
  gh issue create --title "$title" --milestone "$milestone" --label "$labels" --body "$body" >/dev/null
  echo "   + [$milestone] $title"
}

echo "==> Création des issues — Sprint 1"
new_issue "Pages d'accueil du site"                       "Sprint 1" "user-story,frontend" "Page d'accueil publique et navigation dynamique."
new_issue "Gestion des utilisateurs et droits d'accès"    "Sprint 1" "user-story,backend"  "Espace admin : créer/modifier utilisateurs, gérer les rôles et permissions."
new_issue "Inscription / enregistrement d'un membre"      "Sprint 1" "user-story,backend,frontend" "Inscription en ligne ou par l'administrateur."
new_issue "Connexion (authentification JWT)"              "Sprint 1" "user-story,backend"  "Login, émission et vérification du jeton JWT."
new_issue "Validation manuelle et automatique des demandes" "Sprint 1" "user-story,backend" "Approbation admin + courriels automatiques de confirmation."
new_issue "Gestion des membres (CRUD + recherche)"        "Sprint 1" "user-story,backend,frontend" "Inscrire, modifier, lister, rechercher, activer/désactiver un membre."
new_issue "Faire un don (version initiale)"               "Sprint 1" "user-story,backend"  "Enregistrer un don et son historique."

echo "==> Création des issues — Sprint 2"
new_issue "Ajouter un sermon"                             "Sprint 2" "user-story,backend,frontend" "Téléversement (stockage objet) et métadonnées du sermon."
new_issue "Écouter / lire un sermon en ligne"             "Sprint 2" "user-story,frontend" "Lecture audio/vidéo en streaming."
new_issue "Partager un sermon (Facebook, YouTube...)"     "Sprint 2" "user-story,frontend" "Boutons de partage social."
new_issue "Paiement en ligne sécurisé des dons"           "Sprint 2" "user-story,backend"  "Intégration passerelle (carte, PayPal...)."
new_issue "Courriel de remerciement automatique"          "Sprint 2" "user-story,backend"  "Envoi auto au donateur si courriel/téléphone fourni."
new_issue "Historique des dons par utilisateur"           "Sprint 2" "user-story,backend"  "Consultation de l'historique (membre ou visiteur)."
new_issue "Certificats de dons (déduction fiscale)"       "Sprint 2" "user-story,backend"  "Génération de certificats PDF si applicable."
new_issue "Classification / recherche IA des sermons"     "Sprint 2" "user-story,ia"       "Contribution IA : recherche sémantique ou classification par thème."

echo "==> Terminé. Créez ensuite un GitHub Project (Board) et ajoutez-y ces issues."
