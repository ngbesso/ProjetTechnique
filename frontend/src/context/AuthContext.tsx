import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Member, Page, UserInfo } from "../types";
import { fetchMe, logout as apiLogout } from "../lib/api/auth";
import { fetchMyProfile } from "../lib/api/members";
import { getToken } from "../lib/api/client";

interface AuthContextValue {
  user: UserInfo | null;
  member: Member | null;
  loading: boolean;
  setUser: (user: UserInfo | null) => void;
  setMember: (member: Member | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Permissions accordées au rôle "membre" par défaut (voir DEFAULT_ROLES côté
// backend) : un utilisateur qui n'a que celles-ci est un membre ordinaire, pas
// un administrateur. Toute permission en dehors de cet ensemble (peu importe
// le nom du rôle qui l'accorde — admin, organisateur, ou un futur rôle RBAC
// créé depuis l'écran Utilisateurs) signale un accès à une section d'admin.
const MEMBER_ONLY_PERMISSIONS = new Set(["donation:create", "event:read", "sermon:read"]);

export function hasAdminAccess(user: UserInfo | null | undefined): boolean {
  if (!user) return false;
  if (user.is_global_admin) return true;
  return user.permissions.some((p) => p === "*" || !MEMBER_ONLY_PERMISSIONS.has(p));
}

// Libellé du bouton/lien menant à /administration, adapté au rôle : un
// organisateur n'accède qu'à la section Événements, "Administration" serait
// trompeur pour lui.
export function adminActionLabel(user: UserInfo | null | undefined): string {
  if (user?.is_global_admin || user?.roles.includes("admin")) return "Administration";
  if (user?.roles.includes("organisateur")) return "Organiser un événement";
  return "Administration";
}

// Vrai uniquement pour un administrateur global ou le rôle "admin" — à la
// différence de hasAdminAccess, un organisateur ne compte pas. Sert à décider
// quand le badge d'identité peut afficher un mot de rôle plutôt qu'un nom.
export function isTrueAdmin(user: UserInfo | null | undefined): boolean {
  return !!user && (user.is_global_admin || user.roles.includes("admin"));
}

// Page vers laquelle mène le bouton/lien "administration" : le back-office
// complet pour un vrai admin, la page allégée dédiée aux événements pour un
// organisateur.
export function adminActionTarget(user: UserInfo | null | undefined): Page {
  if (user?.is_global_admin || user?.roles.includes("admin")) return "admin";
  if (user?.roles.includes("organisateur")) return "organiser-evenements";
  return "admin";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      fetchMe()
        .then((u) => setUser(u))
        .catch(() => {
          /* token invalide — on ignore */
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Charge la fiche membre liée au compte (404 si aucune — ex. admin pur)
  useEffect(() => {
    if (user) {
      fetchMyProfile()
        .then(setMember)
        .catch(() => setMember(null));
    } else {
      setMember(null);
    }
  }, [user]);

  function logout() {
    apiLogout();
    setUser(null);
    setMember(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, member, loading, setUser, setMember, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
