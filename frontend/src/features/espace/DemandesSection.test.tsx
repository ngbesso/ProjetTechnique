import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemandesSection } from "./DemandesSection";
import type { MemberRequest } from "../../types";

const createMemberRequest = vi.fn();
const fetchMyMemberRequests = vi.fn();

vi.mock("../../lib/api/memberRequests", () => ({
  createMemberRequest: (...args: unknown[]) => createMemberRequest(...args),
  fetchMyMemberRequests: (...args: unknown[]) => fetchMyMemberRequests(...args),
}));

const REQUEST_TYPES = [
  { id: 1, category: "member_request_type", label: "Modification de mes informations", position: 0, restricted_to_sexe: null },
  { id: 2, category: "member_request_type", label: "Question administrative", position: 1, restricted_to_sexe: null },
];

vi.mock("../../hooks/useParameters", () => ({
  useParameters: () => ({ values: REQUEST_TYPES, loading: false, error: "", load: vi.fn() }),
}));

function makeRequest(overrides: Partial<MemberRequest> = {}): MemberRequest {
  return {
    id: 1,
    request_type: "Question administrative",
    message: "Bonjour, une question.",
    status: "new",
    admin_response: null,
    created_at: "2026-03-01T14:30:00Z",
    ...overrides,
  } as MemberRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyMemberRequests.mockResolvedValue([]);
  createMemberRequest.mockResolvedValue(makeRequest());
});

async function renderSection(prefilledType?: string) {
  render(<DemandesSection prefilledType={prefilledType} />);
  await waitFor(() => expect(fetchMyMemberRequests).toHaveBeenCalled());
}

describe("DemandesSection — type pré-rempli", () => {
  it("présélectionne le type transmis par le profil", async () => {
    await renderSection("Modification de mes informations");
    expect(screen.getByLabelText("Type de demande")).toHaveValue("Modification de mes informations");
  });

  it("laisse le choix vide quand aucun type n'est transmis", async () => {
    await renderSection();
    expect(screen.getByLabelText("Type de demande")).toHaveValue("");
  });
});

describe("DemandesSection — soumission", () => {
  it("envoie le type et le message saisis, puis confirme", async () => {
    await renderSection();

    fireEvent.change(screen.getByLabelText("Type de demande"), {
      target: { value: "Question administrative" },
    });
    fireEvent.change(screen.getByLabelText("Votre message"), {
      target: { value: "  Mon adresse a changé.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() =>
      expect(createMemberRequest).toHaveBeenCalledWith({
        request_type: "Question administrative",
        // Le message est nettoyé de ses espaces de bord avant l'envoi.
        message: "Mon adresse a changé.",
      }),
    );
    expect(await screen.findByText(/Votre demande a été envoyée/)).toBeInTheDocument();
  });

  it("vide le message après l'envoi mais conserve le type", async () => {
    await renderSection("Question administrative");
    fireEvent.change(screen.getByLabelText("Votre message"), { target: { value: "Un mot" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.getByLabelText("Votre message")).toHaveValue(""));
    expect(screen.getByLabelText("Type de demande")).toHaveValue("Question administrative");
  });

  it("n'envoie rien si le type est absent", async () => {
    await renderSection();
    fireEvent.change(screen.getByLabelText("Votre message"), { target: { value: "Un mot" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(createMemberRequest).not.toHaveBeenCalled();
  });

  it("n'envoie rien si le message ne contient que des espaces", async () => {
    await renderSection("Question administrative");
    fireEvent.change(screen.getByLabelText("Votre message"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(createMemberRequest).not.toHaveBeenCalled();
  });

  it("affiche l'erreur du serveur sans prétendre que l'envoi a réussi", async () => {
    createMemberRequest.mockRejectedValue(new Error("Type de demande inconnu"));
    await renderSection("Question administrative");
    fireEvent.change(screen.getByLabelText("Votre message"), { target: { value: "Un mot" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Type de demande inconnu");
    expect(screen.queryByText(/Votre demande a été envoyée/)).not.toBeInTheDocument();
  });
});

describe("DemandesSection — historique", () => {
  it("affiche le message vide quand aucune demande n'existe", async () => {
    await renderSection();
    expect(await screen.findByText(/Aucune demande envoyée/)).toBeInTheDocument();
  });

  it("affiche le type, le message et le statut de chaque demande", async () => {
    fetchMyMemberRequests.mockResolvedValue([
      makeRequest({ id: 1, status: "resolved", admin_response: "C'est corrigé." }),
    ]);
    await renderSection();

    // Le libellé existe aussi comme <option> du sélecteur : on cible la carte.
    expect(
      await screen.findByText("Question administrative", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bonjour, une question.")).toBeInTheDocument();
    expect(screen.getByText(/C'est corrigé\./)).toBeInTheDocument();
    expect(screen.getByText("Résolue")).toBeInTheDocument();
  });
});
