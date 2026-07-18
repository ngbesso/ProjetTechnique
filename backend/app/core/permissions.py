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
    "content:manage": "Gérer les pages et le menu (CMS)",
}

# Rôles initiaux et leurs permissions.
DEFAULT_ROLES: dict[str, dict] = {
    "admin": {"description": "Administrateur", "permissions": ["*"]},
    "membre": {
        "description": "Membre",
        "permissions": ["donation:create", "event:read", "sermon:read"],
    },
}

# Permissions qui n'ont de sens qu'au niveau de l'organisation (église mère).
GLOBAL_PERMISSIONS: set[str] = {
    "*",
    "rbac:manage",
    "user:manage",
    "church:manage",
    "content:manage",
}
