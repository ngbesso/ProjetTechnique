import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import type { Page } from "../types";

interface RouterContextValue {
  page: Page;
<<<<<<< HEAD
  params: Record<string, string>;
  navigate: (page: Page, params?: Record<string, string>) => void;
=======
  params: Record<string, unknown>;
  navigate: (page: Page, params?: Record<string, unknown>) => void;
>>>>>>> d0d57f51c33bbaa3ade557af3ed7df98756e9541
}

const RouterContext = createContext<RouterContextValue | null>(null);

// ── Correspondance page ↔ URL ─────────────────────────────────────────────────

const PAGE_PATHS: Record<Page, string> = {
  home: "/",
  login: "/connexion",
  register: "/inscription",
  admin: "/admin",
  adhesion: "/adhesion",
  donation: "/donation",
  sermons: "/sermons",
  blog: "/blog",
  "mon-profil": "/mon-profil",
  espace: "/espace",
  "mot-de-passe-oublie": "/mot-de-passe-oublie",
  confidentialite: "/confidentialite",
};

function pathFor(page: Page, params?: Record<string, unknown>): string {
  if (page === "blog" && typeof params?.postId === "number") {
    return `/blog/${params.postId}`;
  }
  return PAGE_PATHS[page];
}

function parsePath(pathname: string): { page: Page; params: Record<string, unknown> } {
  const blogPost = pathname.match(/^\/blog\/(\d+)$/);
  if (blogPost) {
    return { page: "blog", params: { postId: Number(blogPost[1]) } };
  }
  const entry = (Object.entries(PAGE_PATHS) as [Page, string][]).find(
    ([, path]) => path === pathname,
  );
  return { page: entry?.[0] ?? "home", params: {} };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function RouterProvider({ children }: { children: ReactNode }) {
<<<<<<< HEAD
  const [page, setPage] = useState<Page>("home");
  const [params, setParams] = useState<Record<string, string>>({});

  function navigate(nextPage: Page, nextParams: Record<string, string> = {}) {
    setPage(nextPage);
    setParams(nextParams);
=======
  const initial = parsePath(window.location.pathname);
  const [page, setPage] = useState<Page>(initial.page);
  const [params, setParams] = useState<Record<string, unknown>>(initial.params);

  // Boutons précédent / suivant du navigateur
  useEffect(() => {
    function onPopState() {
      const route = parsePath(window.location.pathname);
      setPage(route.page);
      setParams(route.params);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPage: Page, nextParams?: Record<string, unknown>) {
    const path = pathFor(nextPage, nextParams);
    if (path !== window.location.pathname || window.location.search) {
      window.history.pushState(null, "", path);
    }
    setPage(nextPage);
    setParams(nextParams ?? {});
    window.scrollTo(0, 0);
>>>>>>> d0d57f51c33bbaa3ade557af3ed7df98756e9541
  }

  return (
    <RouterContext.Provider value={{ page, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

<<<<<<< HEAD
export function useNavigate(): (page: Page, params?: Record<string, string>) => void {
=======
export function useNavigate(): (page: Page, params?: Record<string, unknown>) => void {
>>>>>>> d0d57f51c33bbaa3ade557af3ed7df98756e9541
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useNavigate must be used inside <RouterProvider>");
  return ctx.navigate;
}

export function usePage(): Page {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("usePage must be used inside <RouterProvider>");
  return ctx.page;
}

<<<<<<< HEAD
export function useRouteParams(): Record<string, string> {
=======
export function useRouteParams(): Record<string, unknown> {
>>>>>>> d0d57f51c33bbaa3ade557af3ed7df98756e9541
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouteParams must be used inside <RouterProvider>");
  return ctx.params;
}
<<<<<<< HEAD
=======

// ── Défilement vers une section de l'accueil ─────────────────────────────────
// Depuis l'accueil : défile directement. Depuis une autre page : y revient
// d'abord, puis défile une fois le contenu monté. Partagé par le header et le
// footer pour garantir un comportement identique.

export function useGoToSection(): (anchor: string) => void {
  const page = usePage();
  const navigate = useNavigate();
  return (anchor: string) => {
    if (page === "home") {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("home");
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  };
}

// ── Lien SPA ──────────────────────────────────────────────────────────────────
// Un vrai <a href> : clic-molette / Ctrl+clic ouvrent un onglet, le clic simple
// navigue sans recharger la page.

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  page: Page;
  params?: Record<string, unknown>;
  children: ReactNode;
}

export function Link({ page, params, children, onClick, ...anchorProps }: LinkProps) {
  const navigate = useNavigate();
  return (
    <a
      href={pathFor(page, params)}
      {...anchorProps}
      onClick={(e) => {
        onClick?.(e);
        // Laisse le navigateur gérer nouvel onglet / fenêtre / téléchargement
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return;
        }
        e.preventDefault();
        navigate(page, params);
      }}
    >
      {children}
    </a>
  );
}
>>>>>>> d0d57f51c33bbaa3ade557af3ed7df98756e9541
