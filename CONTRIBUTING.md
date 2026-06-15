# Guide de contribution

## Stratégie de branches

Le projet utilise deux branches **durables** et des branches de travail
temporaires.

### Branches durables

- **`main`** — branche stable. Ne contient que des versions démontrables.
  On n'y fusionne que `develop`, en fin de sprint (= une « release »).
  Branche protégée : aucune écriture directe.
- **`develop`** — branche d'intégration. C'est ici que toutes les
  fonctionnalités terminées se rejoignent au quotidien.
  Branche protégée : aucune écriture directe.

### Branches de travail

Elles partent **toujours de `develop`** et y reviennent par Pull Request :

- `feat/<courte-description>` — nouvelle fonctionnalité
- `fix/<courte-description>` — correction de bogue
- `docs/<courte-description>` — documentation
- `chore/<courte-description>` — outillage, configuration

Exemple : `feat/inscription-membre`.

On ne pousse **jamais** directement sur `main` ni sur `develop` :
tout passe par une Pull Request.

## Workflow quotidien

```bash
# 1. Partir d'une branche develop à jour
git checkout develop
git pull

# 2. Créer sa branche de travail
git checkout -b feat/ma-fonctionnalite

# 3. Travailler, puis enregistrer ses changements par petits lots
git add .
git commit -m "feat(membres): ajout du formulaire d'inscription"

# 4. Envoyer la branche sur GitHub
git push -u origin feat/ma-fonctionnalite

# 5. Ouvrir une Pull Request VERS develop, lier l'issue (Closes #12)
```

Après la fusion de la PR :

```bash
git checkout develop
git pull
# la branche de fonctionnalité peut être supprimée
```

### Garder sa branche à jour

Si `develop` a avancé pendant votre travail, récupérez ces changements
régulièrement pour éviter les gros conflits :

```bash
git checkout feat/ma-branche
git merge develop
```

## Fin de sprint : publication vers `main`

À la *sprint review*, on publie l'incrément en fusionnant `develop` dans
`main`, via une Pull Request relue par l'équipe :

```bash
# Ouvrir une PR : base = main, comparaison = develop
# Après revue et CI verte, fusionner.
# (optionnel) poser une étiquette de version :
git checkout main && git pull
git tag -a v0.1.0 -m "Fin du Sprint 1"
git push origin v0.1.0
```

## Commits

Format conseillé (Conventional Commits) :
`type(portée): description` — ex. `feat(membres): ajout de l'inscription`.

Types : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

Bonnes pratiques : des commits **petits et cohérents** (un commit = une idée),
avec un message clair à l'impératif présent.

## Pull Requests

- Une PR par user story / issue.
- Cible : `develop` (sauf les PR de release, qui ciblent `main`).
- Lier l'issue avec `Closes #<numéro>` pour la fermer automatiquement.
- Au moins **1 relecture** d'un coéquipier avant la fusion.
- La **CI doit passer** (lint + tests + build).

## Règles de protection (rappel)

| Branche   | PR obligatoire | CI verte requise | Revue requise |
|-----------|:--------------:|:----------------:|:-------------:|
| `main`    | oui            | oui              | oui           |
| `develop` | oui            | oui              | recommandée   |