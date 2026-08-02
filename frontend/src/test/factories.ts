// Fabriques de données pour les tests de composants : un objet complet et
// valide par défaut, que chaque test surcharge sur le seul champ qui l'intéresse.
import type { Member, MenuItem, UserInfo } from "../types";

export function makeUser(overrides: Partial<UserInfo> = {}): UserInfo {
  return {
    id: 1,
    email: "personne@exemple.com",
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    roles: [],
    permissions: [],
    is_global_admin: false,
    ...overrides,
  };
}

/** Membre ordinaire : les trois permissions du rôle « membre » par défaut. */
export function makeMemberUser(overrides: Partial<UserInfo> = {}): UserInfo {
  return makeUser({
    roles: ["membre"],
    permissions: ["donation:create", "event:read", "sermon:read"],
    ...overrides,
  });
}

export function makeGlobalAdminUser(overrides: Partial<UserInfo> = {}): UserInfo {
  return makeUser({
    email: "admin@exemple.com",
    roles: ["admin"],
    permissions: ["*"],
    is_global_admin: true,
    ...overrides,
  });
}

export function makeOrganiserUser(overrides: Partial<UserInfo> = {}): UserInfo {
  return makeUser({
    email: "organisateur@exemple.com",
    roles: ["organisateur"],
    permissions: ["event:manage", "volunteer:manage"],
    ...overrides,
  });
}

export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 10,
    church_id: 1,
    first_name: "Marie",
    last_name: "Dupont",
    email: "marie@exemple.com",
    address: "12 rue des Lilas",
    birth_date: "1990-06-15",
    sexe: "Femme",
    telephone: "514-555-0100",
    family_status: "Mariée",
    conversion_date: null,
    is_baptized: true,
    member_code: "MBR-2026-0001",
    status: "active",
    created_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

export function makeMenu(): MenuItem[] {
  return [
    { id: 1, label: "Accueil", target_page: "home", position: 0, is_visible: true },
    { id: 2, label: "Sermons", target_page: "sermons", position: 1, is_visible: true },
    { id: 3, label: "Blog", target_page: "blog", position: 2, is_visible: true },
    { id: 4, label: "Faire un don", target_page: "donation", position: 3, is_visible: true },
  ];
}
