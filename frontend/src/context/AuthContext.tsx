import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { UserInfo } from "../types";
import { fetchMe, logout as apiLogout } from "../lib/api/auth";
import { getToken } from "../lib/api/client";

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  setUser: (user: UserInfo | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
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

  function logout() {
    apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
