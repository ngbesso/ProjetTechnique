import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./SiteHeader";
import {
  makeGlobalAdminUser,
  makeMember,
  makeMemberUser,
  makeMenu,
  makeOrganiserUser,
} from "../../test/factories";
import type { Member, UserInfo } from "../../types";

// ── Doublures ────────────────────────────────────────────────────────────────

const navigate = vi.fn();
const logout = vi.fn();

// L'état de session est piloté par test ; les helpers (hasAdminAccess,
// adminActionLabel, isTrueAdmin…) restent les vrais, puisque c'est justement
// la logique qu'on veut vérifier.
let session: { user: UserInfo | null; member: Member | null } = { user: null, member: null };

vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({ ...session, loading: false, setUser: vi.fn(), setMember: vi.fn(), logout }),
}));

// `page`/`params` ne sont pas repris sur l'ancre : la navigation réelle n'est
// pas le sujet ici, seul le rendu des liens et leur onClick le sont.
vi.mock("../../context/RouterContext", () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    className?: string;
  }) => (
    <a className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("../../hooks/useSiteContent", () => ({
  useSiteContent: () => ({
    settings: { site_name: "Mission Évangélique", site_tagline: "unis dans la foi", site_logo_url: "" },
    menu: makeMenu(),
  }),
}));

function setSession(user: UserInfo | null, member: Member | null = null) {
  session = { user, member };
}

beforeEach(() => {
  vi.clearAllMocks();
  setSession(null);
});

// ── Actions de session ───────────────────────────────────────────────────────

describe("SiteHeader — visiteur non connecté", () => {
  it("propose de se connecter et de devenir membre", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("button", { name: /Se connecter/ })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Devenir membre/ })[0]).toBeInTheDocument();
  });

  it("n'affiche ni « Mon espace » ni « Se déconnecter »", () => {
    render(<SiteHeader />);
    expect(screen.queryByRole("button", { name: /Mon espace/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Se déconnecter/ })).not.toBeInTheDocument();
  });

  it("navigue vers la connexion au clic", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getAllByRole("button", { name: /Se connecter/ })[0]);
    expect(navigate).toHaveBeenCalledWith("login");
  });
});

describe("SiteHeader — membre ordinaire", () => {
  beforeEach(() => setSession(makeMemberUser(), makeMember()));

  it("affiche « Mon espace » et « Se déconnecter »", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("button", { name: /Mon espace/ })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Se déconnecter/ })[0]).toBeInTheDocument();
  });

  it("n'ouvre aucun accès à l'administration", () => {
    render(<SiteHeader />);
    expect(screen.queryByRole("button", { name: /Administration/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Organiser un événement/ })).not.toBeInTheDocument();
  });

  it("affiche le nom du membre dans le badge d'identité, pas « Admin »", () => {
    render(<SiteHeader />);
    // Le badge porte le courriel en attribut `title` — c'est lui qu'on cible,
    // sinon /Admin/ attraperait aussi le bouton « Administration ».
    const badge = screen.getByTitle("personne@exemple.com");
    expect(badge).toHaveTextContent("Marie Dupont");
    expect(badge).not.toHaveTextContent("Admin");
  });
});

describe("SiteHeader — administrateur global", () => {
  beforeEach(() => setSession(makeGlobalAdminUser()));

  it("affiche « Administration » et pas « Mon espace » sans fiche membre", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("button", { name: /Administration/ })[0]).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mon espace/ })).not.toBeInTheDocument();
  });

  it("affiche « Admin » comme badge d'identité plutôt que le courriel", () => {
    render(<SiteHeader />);
    const badge = screen.getByTitle("admin@exemple.com");
    expect(badge).toHaveTextContent("Admin");
    expect(badge).not.toHaveTextContent("admin@exemple.com");
  });

  it("mène au back-office complet", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getAllByRole("button", { name: /Administration/ })[0]);
    expect(navigate).toHaveBeenCalledWith("admin");
  });
});

describe("SiteHeader — organisateur", () => {
  beforeEach(() => setSession(makeOrganiserUser()));

  it("affiche « Organiser un événement » plutôt que « Administration »", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("button", { name: /Organiser un événement/ })[0]).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Administration$/ })).not.toBeInTheDocument();
  });

  it("mène à la page allégée des événements", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getAllByRole("button", { name: /Organiser un événement/ })[0]);
    expect(navigate).toHaveBeenCalledWith("organiser-evenements");
  });

  it("affiche son courriel, pas « Admin » — un organisateur n'est pas admin", () => {
    render(<SiteHeader />);
    const badge = screen.getByTitle("organisateur@exemple.com");
    expect(badge).toHaveTextContent("organisateur@exemple.com");
    expect(badge).not.toHaveTextContent("Admin");
  });
});

describe("SiteHeader — membre et organisateur à la fois", () => {
  beforeEach(() => setSession(makeOrganiserUser(), makeMember()));

  it("affiche à la fois « Mon espace » et l'accès organisateur", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("button", { name: /Mon espace/ })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Organiser un événement/ })[0]).toBeInTheDocument();
  });

  it("affiche le nom du membre, puisqu'il ne s'agit pas d'un vrai admin", () => {
    render(<SiteHeader />);
    expect(screen.getByText(/Marie Dupont/)).toBeInTheDocument();
  });
});

// ── Menu burger mobile ───────────────────────────────────────────────────────

describe("SiteHeader — menu burger", () => {
  function burger() {
    return screen.getByRole("button", { name: /Ouvrir le menu|Fermer le menu/ });
  }

  it("est fermé au départ", () => {
    render(<SiteHeader />);
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: /mobile/i })).not.toBeInTheDocument();
  });

  it("ouvre un panneau contenant tous les liens du menu", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    expect(burger()).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("navigation", { name: /mobile/i });
    for (const item of makeMenu()) {
      expect(within(panel).getByText(item.label)).toBeInTheDocument();
    }
  });

  it("reprend les actions de session du visiteur", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    // Deux exemplaires de chaque action : l'en-tête bureau (masqué en CSS) et
    // le panneau mobile — l'important est que le panneau les porte aussi.
    expect(screen.getAllByRole("button", { name: /Se connecter/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Devenir membre/ })).toHaveLength(2);
  });

  it("reprend les actions de session d'un membre connecté", () => {
    setSession(makeMemberUser(), makeMember());
    render(<SiteHeader />);
    fireEvent.click(burger());
    expect(screen.getAllByRole("button", { name: /Mon espace/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Se déconnecter/ })).toHaveLength(2);
  });

  it("se referme au second clic sur le burger", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    fireEvent.click(burger());
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: /mobile/i })).not.toBeInTheDocument();
  });

  it("se referme au clic sur un lien de navigation", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    const panel = screen.getByRole("navigation", { name: /mobile/i });
    fireEvent.click(within(panel).getByText("Sermons"));
    expect(screen.queryByRole("navigation", { name: /mobile/i })).not.toBeInTheDocument();
  });

  it("se referme après une action de session", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    const panelButtons = screen.getAllByRole("button", { name: /Devenir membre/ });
    fireEvent.click(panelButtons[panelButtons.length - 1]);
    expect(navigate).toHaveBeenCalledWith("adhesion");
    expect(screen.queryByRole("navigation", { name: /mobile/i })).not.toBeInTheDocument();
  });

  it("se referme à la touche Échap", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: /mobile/i })).not.toBeInTheDocument();
  });

  it("se referme au clic en dehors du panneau", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("navigation", { name: /mobile/i })).not.toBeInTheDocument();
  });

  it("libère le défilement de la page à la fermeture", () => {
    render(<SiteHeader />);
    fireEvent.click(burger());
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
