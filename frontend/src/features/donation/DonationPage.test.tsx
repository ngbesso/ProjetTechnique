import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DonationPage } from "./DonationPage";
import type { Church, ParameterValue } from "../../types";

const fetchChurches = vi.fn();
const fetchParameters = vi.fn();
const fetchPublicSettings = vi.fn();

vi.mock("../../lib/api/churches", () => ({ fetchChurches: () => fetchChurches() }));
vi.mock("../../lib/api/parameters", () => ({ fetchParameters: (c: string) => fetchParameters(c) }));
vi.mock("../../lib/api/settings", () => ({ fetchPublicSettings: () => fetchPublicSettings() }));

vi.mock("../../components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("../../components/layout/SiteFooter", () => ({ SiteFooter: () => null }));

const CHURCHES = [
  { id: 1, name: "Église centrale", address: "12 rue des Lilas" },
  { id: 2, name: "Église de l'Est", address: null },
] as Church[];

const CATEGORIES = [
  { id: 1, category: "donation_category", label: "Dîme", position: 0, restricted_to_sexe: null },
  { id: 2, category: "donation_category", label: "Offrande", position: 1, restricted_to_sexe: null },
] as ParameterValue[];

const ZEFFY_PATH = "/fr/donation-form/abc";

beforeEach(() => {
  vi.clearAllMocks();
  fetchChurches.mockResolvedValue(CHURCHES);
  fetchParameters.mockResolvedValue(CATEGORIES);
  fetchPublicSettings.mockResolvedValue({ zeffy_embed_path: ZEFFY_PATH });
});

async function renderPage() {
  render(<DonationPage />);
  await screen.findByText("Église centrale");
}

const iframe = () => document.querySelector("iframe");

describe("DonationPage — étape 1 : église", () => {
  it("liste les églises disponibles avec leur adresse", async () => {
    await renderPage();
    expect(screen.getByText("Église centrale")).toBeInTheDocument();
    expect(screen.getByText("12 rue des Lilas")).toBeInTheDocument();
    expect(screen.getByText("Église de l'Est")).toBeInTheDocument();
  });

  it("ne montre ni catégorie ni paiement avant d'avoir choisi une église", async () => {
    await renderPage();
    expect(screen.queryByText("Choisissez une catégorie")).not.toBeInTheDocument();
    expect(iframe()).toBeNull();
  });

  it("signale l'absence d'église configurée", async () => {
    fetchChurches.mockResolvedValue([]);
    render(<DonationPage />);
    expect(await screen.findByText("Aucune église disponible.")).toBeInTheDocument();
  });
});

describe("DonationPage — étape 2 : catégorie", () => {
  it("révèle les catégories une fois l'église choisie", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));

    expect(await screen.findByText("Choisissez une catégorie")).toBeInTheDocument();
    expect(screen.getByText("Dîme")).toBeInTheDocument();
    expect(screen.getByText("Offrande")).toBeInTheDocument();
  });

  it("n'ouvre pas encore le paiement tant qu'aucune catégorie n'est choisie", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));

    await screen.findByText("Choisissez une catégorie");
    expect(iframe()).toBeNull();
  });
});

describe("DonationPage — étape 3 : paiement", () => {
  it("affiche le formulaire Zeffy après église puis catégorie", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));
    fireEvent.click(await screen.findByText("Dîme"));

    await waitFor(() => expect(iframe()).not.toBeNull());
    expect(iframe()?.getAttribute("src")).toContain(ZEFFY_PATH);
  });

  it("rappelle l'église et la catégorie retenues", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));
    fireEvent.click(await screen.findByText("Dîme"));

    const heading = await screen.findByRole("heading", { name: /Don pour/ });
    expect(heading).toHaveTextContent("Église centrale");
    expect(heading).toHaveTextContent("Dîme");
  });

  it("saute l'étape catégorie quand aucune n'est configurée", async () => {
    fetchParameters.mockResolvedValue([]);
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));

    // Sans catégorie disponible, le paiement s'ouvre directement.
    await waitFor(() => expect(iframe()).not.toBeNull());
  });

  it("saute aussi l'étape catégorie si leur chargement échoue", async () => {
    fetchParameters.mockImplementation(() => Promise.reject(new Error("réseau")));
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));

    await waitFor(() => expect(iframe()).not.toBeNull());
  });

  it("avertit quand le formulaire de don n'est pas configuré", async () => {
    fetchPublicSettings.mockResolvedValue({ zeffy_embed_path: "" });
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));
    fireEvent.click(await screen.findByText("Dîme"));

    expect(
      await screen.findByText(/formulaire de don n'est pas encore configuré/),
    ).toBeInTheDocument();
    expect(iframe()).toBeNull();
  });

  it("permet de changer d'église après avoir atteint le paiement", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Église centrale"));
    fireEvent.click(await screen.findByText("Dîme"));
    await waitFor(() => expect(iframe()).not.toBeNull());

    fireEvent.click(screen.getByText("Église de l'Est"));
    const heading = await screen.findByRole("heading", { name: /Don pour/ });
    expect(heading).toHaveTextContent("Église de l'Est");
  });
});
