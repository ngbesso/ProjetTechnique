import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "./AdminPage";
import { makeGlobalAdminUser, makeOrganiserUser, makeUser } from "../../test/factories";
import type { UserInfo } from "../../types";

// Les panneaux ne sont pas le sujet : seuls le menu et l'orchestration le sont.
// Chacun est réduit à une balise reconnaissable. Les fabriques de vi.mock sont
// hoistées, elles ne peuvent donc pas partager de fonction utilitaire.
vi.mock("./AnniversairesPanel", () => ({ AnniversairesPanel: () => <div data-testid="panel-Anniversaires" /> }));
vi.mock("./AssistantPanel", () => ({ AssistantPanel: () => <div data-testid="panel-Assistant" /> }));
vi.mock("./BenevolatPanel", () => ({ BenevolatPanel: () => <div data-testid="panel-Benevolat" /> }));
vi.mock("./BlogPanel", () => ({ BlogPanel: () => <div data-testid="panel-Blog" /> }));
vi.mock("./DashboardPanel", () => ({ DashboardPanel: () => <div data-testid="panel-Dashboard" /> }));
vi.mock("./DemandesMembresPanel", () => ({ DemandesMembresPanel: () => <div data-testid="panel-DemandesMembres" /> }));
vi.mock("./DepensesPanel", () => ({ DepensesPanel: () => <div data-testid="panel-Depenses" /> }));
vi.mock("./EglisesPanel", () => ({ EglisesPanel: () => <div data-testid="panel-Eglises" /> }));
vi.mock("./EvenementsPanel", () => ({ EvenementsPanel: () => <div data-testid="panel-Evenements" /> }));
vi.mock("./LeadershipPanel", () => ({ LeadershipPanel: () => <div data-testid="panel-Leadership" /> }));
vi.mock("./MembresPanel", () => ({ MembresPanel: () => <div data-testid="panel-Membres" /> }));
vi.mock("./NewsPanel", () => ({ NewsPanel: () => <div data-testid="panel-News" /> }));
vi.mock("./MinisteresPanel", () => ({ MinisteresPanel: () => <div data-testid="panel-Ministeres" /> }));
vi.mock("./OrganisateursPanel", () => ({ OrganisateursPanel: () => <div data-testid="panel-Organisateurs" /> }));
vi.mock("./PagesPanel", () => ({ PagesPanel: () => <div data-testid="panel-Pages" /> }));
vi.mock("./ParametresPanel", () => ({ ParametresPanel: () => <div data-testid="panel-Parametres" /> }));
vi.mock("./PrieresPanel", () => ({ PrieresPanel: () => <div data-testid="panel-Prieres" /> }));
vi.mock("./RapportPanel", () => ({ RapportPanel: () => <div data-testid="panel-Rapport" /> }));
vi.mock("./RbacPanel", () => ({ RbacPanel: () => <div data-testid="panel-Rbac" /> }));
vi.mock("./RevenusPanel", () => ({ RevenusPanel: () => <div data-testid="panel-Revenus" /> }));
vi.mock("./SermonsPanel", () => ({ SermonsPanel: () => <div data-testid="panel-Sermons" /> }));
vi.mock("./UsersPanel", () => ({ UsersPanel: () => <div data-testid="panel-Users" /> }));

let pendingCount = 0;
vi.mock("../../hooks/usePendingCount", () => ({
  usePendingCount: () => ({ count: pendingCount, refresh: vi.fn() }),
}));

const navigate = vi.fn();
vi.mock("../../context/RouterContext", () => ({ useNavigate: () => navigate }));

let currentUser: UserInfo | null = null;
vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({
    user: currentUser,
    member: null,
    loading: false,
    setUser: vi.fn(),
    setMember: vi.fn(),
    logout: vi.fn(),
  }),
}));

/** Un administrateur d'église : rôle admin, mais pas de portée globale. */
function makeChurchAdminUser(): UserInfo {
  return makeUser({
    email: "chef@exemple.com",
    roles: ["admin"],
    permissions: ["*"],
    is_global_admin: false,
  });
}

function sidebar() {
  return screen.getByRole("navigation");
}

function groupToggle(label: string) {
  return screen.getByRole("button", { name: new RegExp(`^${label}$`) });
}

beforeEach(() => {
  vi.clearAllMocks();
  pendingCount = 0;
  currentUser = makeGlobalAdminUser();
});

describe("AdminPage — composition du menu selon le rôle", () => {
  it("donne tous les groupes au super-administrateur", () => {
    render(<AdminPage />);
    for (const group of ["Communauté", "Organisation", "Finances", "Contenu", "Demandes", "Système"]) {
      expect(groupToggle(group)).toBeInTheDocument();
    }
  });

  it("masque à un administrateur d'église les entrées réservées au global", () => {
    currentUser = makeChurchAdminUser();
    render(<AdminPage />);

    // Le groupe Finances n'est composé que d'entrées globalOnly : il disparaît.
    expect(screen.queryByRole("button", { name: /^Finances$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Système$/ })).not.toBeInTheDocument();
    // Les groupes mixtes subsistent, amputés de leurs entrées globales.
    expect(groupToggle("Communauté")).toBeInTheDocument();
  });

  it("ne laisse que les Événements à un organisateur pur", () => {
    currentUser = makeOrganiserUser();
    render(<AdminPage />);

    expect(within(sidebar()).getByText("Événements")).toBeInTheDocument();
    expect(within(sidebar()).queryByText("Tableau de bord")).not.toBeInTheDocument();
    expect(within(sidebar()).queryByText("Membres")).not.toBeInTheDocument();
    for (const group of ["Communauté", "Organisation", "Finances", "Demandes", "Système"]) {
      expect(screen.queryByRole("button", { name: new RegExp(`^${group}$`) })).not.toBeInTheDocument();
    }
  });

  it("conserve l'en-tête « Contenu » au-dessus de l'unique entrée de l'organisateur", () => {
    // « Événements » appartient au groupe Contenu : l'en-tête subsiste donc,
    // déplié puisque c'est le groupe de la section active.
    currentUser = makeOrganiserUser();
    render(<AdminPage />);

    expect(groupToggle("Contenu")).toHaveAttribute("aria-expanded", "true");
    expect(within(sidebar()).getByText("Événements")).toBeInTheDocument();
    expect(within(sidebar()).queryByText("Sermons")).not.toBeInTheDocument();
  });

  it("ouvre l'organisateur directement sur les Événements", () => {
    currentUser = makeOrganiserUser();
    render(<AdminPage />);
    expect(screen.getByTestId("panel-Evenements")).toBeInTheDocument();
  });

  it("ouvre les autres profils sur le tableau de bord", () => {
    render(<AdminPage />);
    expect(screen.getByTestId("panel-Dashboard")).toBeInTheDocument();
  });
});

describe("AdminPage — accordéon des groupes", () => {
  it("déplie au départ le seul groupe de la section active", () => {
    render(<AdminPage />);
    // La section initiale est « Tableau de bord », hors groupe : tout est replié.
    expect(groupToggle("Communauté")).toHaveAttribute("aria-expanded", "false");
    expect(within(sidebar()).queryByText("Membres")).not.toBeInTheDocument();
  });

  it("déplie un groupe au clic et révèle ses entrées", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));

    expect(groupToggle("Communauté")).toHaveAttribute("aria-expanded", "true");
    expect(within(sidebar()).getByText("Membres")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Ministères")).toBeInTheDocument();
  });

  it("replie le groupe au second clic", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));
    fireEvent.click(groupToggle("Communauté"));

    expect(groupToggle("Communauté")).toHaveAttribute("aria-expanded", "false");
    expect(within(sidebar()).queryByText("Membres")).not.toBeInTheDocument();
  });

  it("laisse plusieurs groupes ouverts simultanément", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));
    fireEvent.click(groupToggle("Contenu"));

    expect(within(sidebar()).getByText("Membres")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Sermons")).toBeInTheDocument();
  });

  it("garde le groupe de la section active ouvert après navigation", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));
    fireEvent.click(within(sidebar()).getByText("Membres"));

    expect(screen.getByTestId("panel-Membres")).toBeInTheDocument();
    expect(groupToggle("Communauté")).toHaveAttribute("aria-expanded", "true");
  });
});

describe("AdminPage — sélection de section", () => {
  it("affiche le panneau correspondant à l'entrée cliquée", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Contenu"));
    fireEvent.click(within(sidebar()).getByText("Sermons"));

    expect(screen.getByTestId("panel-Sermons")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-Dashboard")).not.toBeInTheDocument();
  });

  it("marque l'entrée courante pour les lecteurs d'écran", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Contenu"));
    const entry = within(sidebar()).getByText("Blog").closest("button")!;
    fireEvent.click(entry);
    expect(entry).toHaveAttribute("aria-current", "page");
  });

  it("reprend le libellé de la section dans le titre", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Demandes"));
    fireEvent.click(within(sidebar()).getByText("Bénévolat"));
    expect(screen.getByRole("heading", { name: "Bénévolat" })).toBeInTheDocument();
  });
});

describe("AdminPage — accessibilité du menu", () => {
  it("nomme chaque entrée indépendamment du libellé visible", () => {
    // Sous 768px le libellé est masqué en CSS : sans aria-label, il ne resterait
    // que l'icône et le bouton serait annoncé « bouton ».
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));

    for (const label of ["Tableau de bord", "Membres", "Ministères"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("masque les icônes aux technologies d'assistance", () => {
    render(<AdminPage />);
    const entry = screen.getByRole("button", { name: "Tableau de bord" });
    const icon = entry.querySelector("span");
    expect(icon).toHaveAttribute("aria-hidden");
    expect(icon?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("annonce l'état des en-têtes de groupe", () => {
    render(<AdminPage />);
    expect(groupToggle("Contenu")).toHaveAttribute("aria-expanded");
  });
});

describe("AdminPage — badge des demandes en attente", () => {
  it("reste masqué quand aucune adhésion n'attend", () => {
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));
    const entry = within(sidebar()).getByText("Membres").closest("button")!;
    expect(within(entry).queryByText("3")).not.toBeInTheDocument();
  });

  it("annonce le nombre d'adhésions en attente sur l'entrée Membres", () => {
    pendingCount = 3;
    render(<AdminPage />);
    fireEvent.click(groupToggle("Communauté"));
    const entry = within(sidebar()).getByText("Membres").closest("button")!;
    expect(within(entry).getByText("3")).toBeInTheDocument();
  });
});
