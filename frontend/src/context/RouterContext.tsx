import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Page } from "../types";

interface RouterContextValue {
  page: Page;
  params: Record<string, string>;
  navigate: (page: Page, params?: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("home");
  const [params, setParams] = useState<Record<string, string>>({});

  function navigate(nextPage: Page, nextParams: Record<string, string> = {}) {
    setPage(nextPage);
    setParams(nextParams);
  }

  return (
    <RouterContext.Provider value={{ page, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useNavigate(): (page: Page, params?: Record<string, string>) => void {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useNavigate must be used inside <RouterProvider>");
  return ctx.navigate;
}

export function usePage(): Page {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("usePage must be used inside <RouterProvider>");
  return ctx.page;
}

export function useRouteParams(): Record<string, string> {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouteParams must be used inside <RouterProvider>");
  return ctx.params;
}
