import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Page } from "../types";

interface RouterContextValue {
  page: Page;
  navigate: (page: Page) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("home");

  return (
    <RouterContext.Provider value={{ page, navigate: setPage }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useNavigate(): (page: Page) => void {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useNavigate must be used inside <RouterProvider>");
  return ctx.navigate;
}

export function usePage(): Page {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("usePage must be used inside <RouterProvider>");
  return ctx.page;
}
