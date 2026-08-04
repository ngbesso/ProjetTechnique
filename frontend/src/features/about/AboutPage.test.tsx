import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AboutPage } from "./AboutPage";

// Réglages injectés par test. Le défaut reprend le contenu réel de
// l'organisation, tel que servi par GET /settings/public.
let settings: Record<string, string> = {};

vi.mock("../../hooks/useSiteContent", () => ({
  useSiteContent: () => ({ settings, menu: [] }),
}));

vi.mock("../../components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("../../components/layout/SiteFooter", () => ({ SiteFooter: () => null }));

const VALEURS = [
  "Une église remplie de l'Esprit Saint",
  "Une église qui s'attache aux saines paroles du Seigneur Jésus-Christ",
  "Une église qui étudie la parole de Dieu et la met en pratique",
  "Une église qui cultive une vie de prière",
  "Une église qui glorifie Dieu et témoigne de sa grâce",
  "Une église qui persévère dans la communion fraternelle",
];

const PRINCIPES = [
  "La fidélité à la parole de Dieu et à la proclamation de l'Évangile centrée sur Christ",
  "La rigueur dans l'étude des Écritures",
  "La nécessité de la croissance et de la maturité spirituelles du disciple de Jésus-Christ",
];

const CREDO = Array.from({ length: 11 }, (_, i) => `Point de crédo numéro ${i + 1}`);

function setSettings(overrides: Record<string, string> = {}) {
  settings = {
    about_page_eyebrow: "Qui sommes-nous",
    about_page_title: "Notre identité",
    about_welcome: "L'EENOJEC est une congrégation chrétienne évangélique établie à Montréal.",
    about_vision_text: "Former des disciples pour Christ.",
    about_mission_text: "Glorifier Dieu par une adoration authentique.",
    about_valeurs_list: VALEURS.join("\n"),
    about_principes_list: PRINCIPES.join("\n"),
    about_credo_list: CREDO.join("\n"),
    pillar_vision_label: "Vision",
    pillar_mission_label: "Mission",
    pillar_valeurs_label: "Valeurs",
    pillar_credo_label: "Crédo",
    pillar_principes_label: "Principes",
    pillar_vision_desc: "Résumé vision",
    pillar_mission_desc: "Résumé mission",
    ...overrides,
  };
}

beforeEach(() => setSettings());

describe("AboutPage — contenu de l'organisation", () => {
  it("affiche le bandeau depuis les réglages", () => {
    render(<AboutPage />);
    expect(screen.getByText("Qui sommes-nous")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notre identité", level: 1 })).toBeInTheDocument();
  });

  it("affiche le texte de bienvenue", () => {
    render(<AboutPage />);
    expect(screen.getByText(/congrégation chrétienne évangélique établie à Montréal/)).toBeInTheDocument();
  });

  it("rend les cinq sections dans l'ordre vision, mission, valeurs, principes, crédo", () => {
    render(<AboutPage />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Vision", "Mission", "Valeurs", "Principes", "Crédo"]);
  });

  it("découpe la liste des valeurs en 6 éléments", () => {
    render(<AboutPage />);
    const section = screen.getByRole("heading", { name: "Valeurs" }).closest("section")!;
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent(VALEURS[0]);
    expect(items[5]).toHaveTextContent(VALEURS[5]);
  });

  it("découpe la liste des principes en 3 éléments", () => {
    render(<AboutPage />);
    const section = screen.getByRole("heading", { name: "Principes" }).closest("section")!;
    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
  });

  it("découpe le crédo en 11 points", () => {
    render(<AboutPage />);
    const section = screen.getByRole("heading", { name: "Crédo" }).closest("section")!;
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items[10]).toHaveTextContent("Point de crédo numéro 11");
  });

  it("ignore les lignes vides et les espaces de bord", () => {
    setSettings({ about_valeurs_list: "  Première  \n\n\n  Seconde  \n" });
    render(<AboutPage />);
    const section = screen.getByRole("heading", { name: "Valeurs" }).closest("section")!;
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Première");
  });
});

describe("AboutPage — sections absentes", () => {
  it("masque une liste vide", () => {
    setSettings({ about_credo_list: "" });
    render(<AboutPage />);
    expect(screen.queryByRole("heading", { name: "Crédo" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Valeurs" })).toBeInTheDocument();
  });

  it("masque le texte de bienvenue quand il est vide", () => {
    setSettings({ about_welcome: "" });
    render(<AboutPage />);
    expect(screen.queryByText(/congrégation chrétienne/)).not.toBeInTheDocument();
  });

  it("retombe sur le résumé de la carte quand le texte long manque", () => {
    setSettings({ about_vision_text: "" });
    render(<AboutPage />);
    expect(screen.getByText("Résumé vision")).toBeInTheDocument();
  });

  it("invite à renseigner le contenu quand tout est vide", () => {
    setSettings({
      about_welcome: "",
      about_vision_text: "",
      about_mission_text: "",
      about_valeurs_list: "",
      about_principes_list: "",
      about_credo_list: "",
      pillar_vision_desc: "",
      pillar_mission_desc: "",
    });
    render(<AboutPage />);
    expect(screen.getByText(/n'a pas encore été renseigné/)).toBeInTheDocument();
  });
});
