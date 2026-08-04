import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InscriptionsSection } from "./InscriptionsSection";
import type { MyEventRegistration } from "../../types";

const fetchMyEventRegistrations = vi.fn();

vi.mock("../../lib/api/events", () => ({
  fetchMyEventRegistrations: () => fetchMyEventRegistrations(),
}));

vi.mock("../../context/RouterContext", () => ({ useNavigate: () => vi.fn() }));

const FUTURE = "2099-05-03T19:00:00Z";
const PAST = "2020-05-03T19:00:00Z";

function makeReg(overrides: Partial<MyEventRegistration["event"]> = {}, id = 1): MyEventRegistration {
  return {
    id,
    event_id: id,
    registered_at: "2026-01-01T10:00:00Z",
    event: {
      id,
      title: "Retraite de printemps",
      category: "Retraite",
      date_start: FUTURE,
      location: "Montréal",
      format: "presentiel",
      online_link: null,
      ...overrides,
    },
  } as MyEventRegistration;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyEventRegistrations.mockResolvedValue([]);
});

async function renderSection() {
  render(<InscriptionsSection />);
  await waitFor(() => expect(fetchMyEventRegistrations).toHaveBeenCalled());
}

describe("InscriptionsSection — répartition à venir / passées", () => {
  it("annonce les deux listes vides quand il n'y a aucune inscription", async () => {
    await renderSection();
    expect(await screen.findByText("Aucun événement à venir.")).toBeInTheDocument();
    expect(screen.getByText("Aucun événement passé.")).toBeInTheDocument();
  });

  it("place un événement futur dans « À venir » et un passé dans « Passées »", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ title: "Bientôt", date_start: FUTURE }, 1),
      makeReg({ title: "Déjà tenu", date_start: PAST }, 2),
    ]);
    await renderSection();

    expect(await screen.findByText("Bientôt")).toBeInTheDocument();
    expect(screen.getByText("Déjà tenu")).toBeInTheDocument();
    expect(screen.queryByText("Aucun événement à venir.")).not.toBeInTheDocument();
    expect(screen.queryByText("Aucun événement passé.")).not.toBeInTheDocument();
  });

  it("trie les événements à venir du plus proche au plus lointain", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ title: "Lointain", date_start: "2099-12-01T10:00:00Z" }, 1),
      makeReg({ title: "Proche", date_start: "2099-01-01T10:00:00Z" }, 2),
    ]);
    await renderSection();

    const titles = (await screen.findAllByText(/Lointain|Proche/)).map((n) => n.textContent);
    expect(titles).toEqual(["Proche", "Lointain"]);
  });

  it("trie les événements passés du plus récent au plus ancien", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ title: "Ancien", date_start: "2019-01-01T10:00:00Z" }, 1),
      makeReg({ title: "Récent", date_start: "2021-01-01T10:00:00Z" }, 2),
    ]);
    await renderSection();

    const titles = (await screen.findAllByText(/Ancien|Récent/)).map((n) => n.textContent);
    expect(titles).toEqual(["Récent", "Ancien"]);
  });
});

describe("InscriptionsSection — carte d'inscription selon le format", () => {
  it("affiche le lieu d'un événement en présentiel", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ format: "presentiel", location: "Montréal" }),
    ]);
    await renderSection();
    expect(await screen.findByText(/Montréal/)).toBeInTheDocument();
  });

  it("remplace le lieu par « En ligne » pour un événement distanciel", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ format: "en_ligne", location: "Montréal", online_link: "https://meet.test/x" }),
    ]);
    await renderSection();
    expect(await screen.findByText(/En ligne/)).toBeInTheDocument();
    expect(screen.queryByText(/Montréal/)).not.toBeInTheDocument();
  });

  it("donne le lien de connexion pour un événement en ligne à venir", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ format: "en_ligne", date_start: FUTURE, online_link: "https://meet.test/x" }),
    ]);
    await renderSection();
    expect(await screen.findByRole("link", { name: "https://meet.test/x" })).toBeInTheDocument();
  });

  it("masque le lien d'un événement en ligne déjà passé", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ format: "en_ligne", date_start: PAST, online_link: "https://meet.test/x" }),
    ]);
    await renderSection();
    await waitFor(() => expect(screen.getByText("Retraite de printemps")).toBeInTheDocument());
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("affiche lieu et lien pour un événement hybride", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      makeReg({ format: "hybride", location: "Montréal", online_link: "https://meet.test/x" }),
    ]);
    await renderSection();
    expect(await screen.findByText(/Montréal/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://meet.test/x" })).toBeInTheDocument();
  });
});

describe("InscriptionsSection — erreur de chargement", () => {
  it("affiche le message du serveur", async () => {
    fetchMyEventRegistrations.mockImplementation(() =>
      Promise.reject(new Error("Service indisponible")),
    );
    render(<InscriptionsSection />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Service indisponible");
  });
});
