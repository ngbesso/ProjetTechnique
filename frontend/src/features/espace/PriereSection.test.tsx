import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PriereSection } from "./PriereSection";
import type { PrayerRequest } from "../../types";

const createPrayerRequest = vi.fn();
const fetchMyPrayerRequests = vi.fn();

vi.mock("../../lib/api/prayerRequests", () => ({
  createPrayerRequest: (...args: unknown[]) => createPrayerRequest(...args),
  fetchMyPrayerRequests: () => fetchMyPrayerRequests(),
}));

function makeRequest(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 1,
    member_id: 10,
    message: "Priez pour ma famille.",
    status: "new",
    created_at: "2026-03-01T14:30:00Z",
    ...overrides,
  } as PrayerRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyPrayerRequests.mockResolvedValue([]);
  createPrayerRequest.mockResolvedValue(makeRequest());
});

async function renderSection() {
  render(<PriereSection />);
  await waitFor(() => expect(fetchMyPrayerRequests).toHaveBeenCalled());
}

describe("PriereSection — envoi", () => {
  it("envoie le message nettoyé de ses espaces de bord", async () => {
    await renderSection();
    fireEvent.change(screen.getByLabelText("Votre demande"), {
      target: { value: "  Priez pour ma famille.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(createPrayerRequest).toHaveBeenCalledWith({ message: "Priez pour ma famille." }),
    );
  });

  it("confirme puis vide le champ", async () => {
    await renderSection();
    fireEvent.change(screen.getByLabelText("Votre demande"), { target: { value: "Un sujet" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText(/demande de prière a été envoyée/)).toBeInTheDocument();
    expect(screen.getByLabelText("Votre demande")).toHaveValue("");
  });

  it("recharge la liste après l'envoi", async () => {
    await renderSection();
    fireEvent.change(screen.getByLabelText("Votre demande"), { target: { value: "Un sujet" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(fetchMyPrayerRequests).toHaveBeenCalledTimes(2));
  });

  it("n'envoie rien si le message ne contient que des espaces", async () => {
    await renderSection();
    fireEvent.change(screen.getByLabelText("Votre demande"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(createPrayerRequest).not.toHaveBeenCalled();
  });

  it("affiche l'erreur du serveur sans annoncer un succès", async () => {
    createPrayerRequest.mockImplementation(() => Promise.reject(new Error("Quota atteint")));
    await renderSection();
    fireEvent.change(screen.getByLabelText("Votre demande"), { target: { value: "Un sujet" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Quota atteint");
    expect(screen.queryByText(/a été envoyée/)).not.toBeInTheDocument();
  });
});

describe("PriereSection — historique", () => {
  it("annonce une liste vide", async () => {
    await renderSection();
    expect(await screen.findByText(/Aucune demande envoyée/)).toBeInTheDocument();
  });

  it("affiche le message et traduit le statut", async () => {
    fetchMyPrayerRequests.mockResolvedValue([makeRequest({ status: "handled" })]);
    await renderSection();

    expect(await screen.findByText("Priez pour ma famille.")).toBeInTheDocument();
    expect(screen.getByText("Traitée")).toBeInTheDocument();
  });

  it("distingue une demande non traitée", async () => {
    fetchMyPrayerRequests.mockResolvedValue([makeRequest({ status: "new" })]);
    await renderSection();
    expect(await screen.findByText("Nouvelle")).toBeInTheDocument();
  });

  it("remonte une erreur de chargement", async () => {
    fetchMyPrayerRequests.mockImplementation(() => Promise.reject(new Error("Hors service")));
    render(<PriereSection />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hors service");
  });
});
