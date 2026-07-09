import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Member, UserInfo } from "../types";
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
