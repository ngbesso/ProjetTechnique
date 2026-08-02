# Catalogue des permissions, regroupées par module.
PERMISSIONS: dict[str, str] = {
    "*": "Toutes les permissions (super-administrateur)",
    "rbac:manage": "Gérer les rôles et permissions",
    "user:manage": "Gérer les comptes utilisateurs",
    "member:read": "Consulter les membres",
    "member:create": "Créer un membre",
    "member:update": "Modifier un membre",
    "member:approve": "Approuver une demande d'adhésion",
    "church:manage": "Gérer les Églises affiliées",
    "donation:read": "Consulter les dons",
    "donation:create": "Faire un don",
    "event:read": "Consulter les événements",
    "event:manage": "Gérer les événements",
    "sermon:read": "Consulter les sermons",
    "sermon:manage": "Gérer les sermons",
    "post:manage": "Gérer les articles de blog",
    "news:manage": "Gérer les actualités",
    "content:manage": "Gérer les pages et le menu (CMS)",
    "settings:manage": "Gérer les réglages du site et du système",
    "parameter:manage": "Gérer les listes de valeurs paramétrables",
    "prayer:manage": "Gérer les demandes de prière",
    "member_request:manage": "Gérer les demandes libres des membres",
    "volunteer:manage": "Gérer les demandes de bénévolat",
    "finance:manage": "Gérer les finances (dons, dépenses, rapports)",
    "leader:manage": "Gérer les membres du leadership",
}

# Rôles initiaux et leurs permissions.
DEFAULT_ROLES: dict[str, dict] = {
    "admin": {"description": "Administrateur", "permissions": ["*"]},
    "membre": {
        "description": "Membre",
        "permissions": ["donation:create", "event:read", "sermon:read"],
    },
    "organisateur": {
        "description": "Organisateur d'événements",
        # volunteer:manage lui donne accès aux demandes de bénévolat, mais
        # uniquement pour les événements qu'il a lui-même créés (le périmètre
        # est appliqué dans volunteer_requests.py).
        "permissions": ["event:manage", "volunteer:manage"],
    },
    "equipe_pastorale": {
        "description": "Équipe pastorale (demandes de prière)",
        # Attribuable par église via UserRole.church_id : l'équipe ne voit
        # alors que les demandes des membres de son église.
        "permissions": ["prayer:manage"],
    },
}

# Permissions qui n'ont de sens qu'au niveau de l'organisation (église mère).
GLOBAL_PERMISSIONS: set[str] = {
    "*",
    "rbac:manage",
    "user:manage",
    "church:manage",
    "content:manage",
    "settings:manage",
    "parameter:manage",
}
