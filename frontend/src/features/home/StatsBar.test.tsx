import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatsBar } from "./HomePage";

const fetchPublicStats = vi.fn();

vi.mock("../../lib/api/stats", () => ({
  fetchPublicStats: () => fetchPublicStats(),
}));

// Réglages pilotés par test : ce sont eux qui portent les jetons.
let settings: Record<string, string> = {};

vi.mock("../../hooks/useSiteContent", () => ({
  useSiteContent: () => ({ settings, menu: [] }),
}));

function setStats(overrides: Partial<Record<string, string>> = {}) {
  settings = {
    hero_stat1_value: "{eglises}",
    hero_stat1_label: "Églises affiliées",
    hero_stat2_value: "{membres}",
    hero_stat2_label: "Membres actifs",
    hero_stat3_value: "8",
    hero_stat3_label: "Pays",
    hero_stat4_value: "40 ans",
    hero_stat4_label: "De mission",
    ...overrides,
  };
}

const COUNTS = { active_churches: 130, affiliated_churches: 129, active_members: 15000 };

beforeEach(() => {
  vi.clearAllMocks();
  setStats();
  fetchPublicStats.mockResolvedValue(COUNTS);
});

describe("StatsBar — substitution des jetons", () => {
  it("remplace {eglises} par le nombre d'églises affiliées", async () => {
    render(<StatsBar />);
    expect(await screen.findByText("129")).toBeInTheDocument();
    expect(screen.getByText("Églises affiliées")).toBeInTheDocument();
  });

  it("remplace {membres} par le nombre de membres actifs", async () => {
    render(<StatsBar />);
    expect(await screen.findByText("15000")).toBeInTheDocument();
    expect(screen.getByText("Membres actifs")).toBeInTheDocument();
  });

  it("laisse une valeur sans jeton littérale", async () => {
    render(<StatsBar />);
    await waitFor(() => expect(screen.getByText("129")).toBeInTheDocument());
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("40 ans")).toBeInTheDocument();
  });

  it("substitue un jeton inséré dans une phrase", async () => {
    setStats({ hero_stat3_value: "plus de {eglises} lieux" });
    render(<StatsBar />);
    expect(await screen.findByText("plus de 129 lieux")).toBeInTheDocument();
  });
});

describe("StatsBar — statistique vide", () => {
  it("n'affiche pas une statistique dont la valeur est vide", async () => {
    setStats({ hero_stat4_value: "" });
    render(<StatsBar />);
    await waitFor(() => expect(screen.getByText("129")).toBeInTheDocument());
    expect(screen.queryByText("De mission")).not.toBeInTheDocument();
  });

  it("ignore une valeur qui n'est faite que d'espaces", async () => {
    setStats({ hero_stat3_value: "   " });
    render(<StatsBar />);
    await waitFor(() => expect(screen.getByText("129")).toBeInTheDocument());
    expect(screen.queryByText("Pays")).not.toBeInTheDocument();
  });

  it("n'affiche rien du tout quand les quatre valeurs sont vides", async () => {
    setStats({
      hero_stat1_value: "",
      hero_stat2_value: "",
      hero_stat3_value: "",
      hero_stat4_value: "",
    });
    const { container } = render(<StatsBar />);
    await waitFor(() => expect(fetchPublicStats).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe("StatsBar — repli quand les comptages échouent", () => {
  // mockImplementation plutôt que mockRejectedValue : la promesse rejetée n'est
  // créée qu'à l'appel, donc toujours consommée par le .catch du composant.
  beforeEach(() => {
    fetchPublicStats.mockImplementation(() => Promise.reject(new Error("réseau")));
  });

  it("n'affiche jamais un jeton brut à l'écran", async () => {
    render(<StatsBar />);
    await waitFor(() => expect(screen.getByText("8")).toBeInTheDocument());
    expect(screen.queryByText(/\{eglises\}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\{membres\}/)).not.toBeInTheDocument();
  });

  it("masque les statistiques réduites à un jeton, garde les valeurs littérales", async () => {
    render(<StatsBar />);
    await waitFor(() => expect(screen.getByText("8")).toBeInTheDocument());
    expect(screen.queryByText("Églises affiliées")).not.toBeInTheDocument();
    expect(screen.queryByText("Membres actifs")).not.toBeInTheDocument();
    expect(screen.getByText("40 ans")).toBeInTheDocument();
  });

  it("conserve le texte qui entoure un jeton effacé", async () => {
    setStats({ hero_stat3_value: "plus de {eglises} lieux" });
    render(<StatsBar />);
    // Testing Library normalise les espaces : « plus de  lieux » y devient
    // « plus de lieux ».
    expect(await screen.findByText("plus de lieux")).toBeInTheDocument();
  });
});
