import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Page } from "../types";

interface RouterContextValue {
  page: Page;
  params: Record<string, unknown>;
  navigate: (page: Page, params?: Record<string, unknown>) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("home");
  const [params, setParams] = useState<Record<string, unknown>>({});

  function navigate(nextPage: Page, nextParams?: Record<string, unknown>) {
    setPage(nextPage);
    setParams(nextParams ?? {});
  }

  return (
    <RouterContext.Provider value={{ page, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useNavigate(): (page: Page, params?: Record<string, unknown>) => void {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useNavigate must be used inside <RouterProvider>");
  return ctx.navigate;
}

export function usePage(): Page {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("usePage must be used inside <RouterProvider>");
  return ctx.page;
}

export function useRouteParams(): Record<string, unknown> {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouteParams must be used inside <RouterProvider>");
  return ctx.params;
}
