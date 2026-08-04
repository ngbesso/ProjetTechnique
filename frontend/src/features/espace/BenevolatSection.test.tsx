import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BenevolatSection } from "./BenevolatSection";
import type { VolunteerOpportunity, VolunteerRequest } from "../../types";

const getVolunteerOpportunities = vi.fn();
const createVolunteerRequest = vi.fn();
const fetchMyVolunteerRequests = vi.fn();

vi.mock("../../lib/api/events", () => ({
  getVolunteerOpportunities: () => getVolunteerOpportunities(),
}));

vi.mock("../../lib/api/volunteerRequests", () => ({
  createVolunteerRequest: (...args: unknown[]) => createVolunteerRequest(...args),
  fetchMyVolunteerRequests: () => fetchMyVolunteerRequests(),
}));

function makeOpportunity(overrides: Partial<VolunteerOpportunity> = {}): VolunteerOpportunity {
  return {
    event_id: 7,
    title: "Distribution alimentaire",
    date_start: "2099-05-03T09:00:00Z",
    location: "Montréal",
    church_id: 1,
    volunteer_capacity: 10,
    volunteer_spots_left: 4,
    volunteer_message: "Nous cherchons des bras.",
    ...overrides,
  };
}

function makeRequest(overrides: Partial<VolunteerRequest> = {}): VolunteerRequest {
  return {
    id: 1,
    member_id: 10,
    event_id: 7,
    event_title: "Distribution alimentaire",
    message: "Disponible le matin",
    status: "pending",
    created_at: "2026-03-01T14:30:00Z",
    ...overrides,
  } as VolunteerRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  getVolunteerOpportunities.mockResolvedValue([]);
  fetchMyVolunteerRequests.mockResolvedValue([]);
  createVolunteerRequest.mockResolvedValue(makeRequest());
});

async function renderSection() {
  render(<BenevolatSection />);
  await waitFor(() => expect(getVolunteerOpportunities).toHaveBeenCalled());
}

describe("BenevolatSection — opportunités", () => {
  it("annonce l'absence d'opportunité", async () => {
    await renderSection();
    expect(await screen.findByText(/Aucun événement ne recherche de bénévoles/)).toBeInTheDocument();
  });

  it("affiche titre, lieu, message et places restantes", async () => {
    getVolunteerOpportunities.mockResolvedValue([makeOpportunity()]);
    await renderSection();

    expect(await screen.findByText(/Distribution alimentaire/)).toBeInTheDocument();
    expect(screen.getByText(/Montréal/)).toBeInTheDocument();
    expect(screen.getByText("Nous cherchons des bras.")).toBeInTheDocument();
    expect(screen.getByText("4 place(s) restante(s)")).toBeInTheDocument();
  });

  it("propose de se porter volontaire", async () => {
    getVolunteerOpportunities.mockResolvedValue([makeOpportunity()]);
    await renderSection();
    expect(await screen.findByRole("button", { name: "Je me propose" })).toBeInTheDocument();
  });
});

describe("BenevolatSection — demande déjà envoyée", () => {
  it("bloque un événement pour lequel une demande existe déjà", async () => {
    getVolunteerOpportunities.mockResolvedValue([makeOpportunity({ event_id: 7 })]);
    fetchMyVolunteerRequests.mockResolvedValue([makeRequest({ event_id: 7 })]);
    await renderSection();

    expect(await screen.findByText(/Demande déjà envoyée pour cet événement/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Je me propose" })).not.toBeInTheDocument();
  });

  it("laisse ouverts les autres événements", async () => {
    getVolunteerOpportunities.mockResolvedValue([
      makeOpportunity({ event_id: 7, title: "Déjà demandé" }),
      makeOpportunity({ event_id: 8, title: "Encore ouvert" }),
    ]);
    fetchMyVolunteerRequests.mockResolvedValue([makeRequest({ event_id: 7 })]);
    await renderSection();

    expect(await screen.findByText(/Demande déjà envoyée/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Je me propose" })).toHaveLength(1);
  });
});

describe("BenevolatSection — envoi d'une proposition", () => {
  async function openForm() {
    getVolunteerOpportunities.mockResolvedValue([makeOpportunity({ event_id: 7 })]);
    await renderSection();
    fireEvent.click(await screen.findByRole("button", { name: "Je me propose" }));
  }

  it("ouvre le formulaire avec un message facultatif", async () => {
    await openForm();
    expect(screen.getByLabelText("Message (optionnel)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer ma proposition" })).toBeInTheDocument();
  });

  it("envoie l'identifiant de l'événement et le message saisi", async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText("Message (optionnel)"), {
      target: { value: "  Disponible le matin  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));

    await waitFor(() =>
      expect(createVolunteerRequest).toHaveBeenCalledWith({
        event_id: 7,
        message: "Disponible le matin",
      }),
    );
  });

  it("omet le message quand il est laissé vide", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));

    await waitFor(() =>
      expect(createVolunteerRequest).toHaveBeenCalledWith({ event_id: 7, message: undefined }),
    );
  });

  it("confirme et referme le formulaire", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));

    expect(await screen.findByText(/demande de bénévolat a été envoyée/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Message (optionnel)")).not.toBeInTheDocument();
  });

  it("permet d'annuler sans rien envoyer", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByLabelText("Message (optionnel)")).not.toBeInTheDocument();
    expect(createVolunteerRequest).not.toHaveBeenCalled();
  });

  it("affiche l'erreur du serveur et garde le formulaire ouvert", async () => {
    createVolunteerRequest.mockImplementation(() => Promise.reject(new Error("Plus de places")));
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma proposition" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Plus de places");
    expect(screen.getByLabelText("Message (optionnel)")).toBeInTheDocument();
  });
});

describe("BenevolatSection — mes demandes", () => {
  it("affiche l'événement et traduit le statut", async () => {
    fetchMyVolunteerRequests.mockResolvedValue([makeRequest({ status: "approved" })]);
    await renderSection();

    expect(await screen.findByText(/Distribution alimentaire/)).toBeInTheDocument();
    expect(screen.getByText("Approuvée")).toBeInTheDocument();
  });

  it("distingue une demande refusée", async () => {
    fetchMyVolunteerRequests.mockResolvedValue([makeRequest({ status: "rejected" })]);
    await renderSection();
    expect(await screen.findByText("Refusée")).toBeInTheDocument();
  });
});
