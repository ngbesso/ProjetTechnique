import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenuCreateModal } from "./RevenuCreateModal";
import type { Church } from "../../../types";

const createManualDonation = vi.fn();
const uploadDonationAttachment = vi.fn();
const fetchMembers = vi.fn();
const searchDonors = vi.fn();
const createDonor = vi.fn();

vi.mock("../../../lib/api/donations", () => ({
  createManualDonation: (...args: unknown[]) => createManualDonation(...args),
  uploadDonationAttachment: (...args: unknown[]) => uploadDonationAttachment(...args),
  downloadDonationAttachment: vi.fn(),
}));

vi.mock("../../../lib/api/donors", () => ({
  searchDonors: (...args: unknown[]) => searchDonors(...args),
  createDonor: (...args: unknown[]) => createDonor(...args),
}));

vi.mock("../../../lib/api/members", () => ({
  fetchMembers: (...args: unknown[]) => fetchMembers(...args),
}));

const CHURCHES: Church[] = [
  { id: 1, name: "Église centrale", district: "Centre", parent_id: null, is_mother: true, is_active: true } as Church,
];

const onClose = vi.fn();
const onCreated = vi.fn();

function renderModal() {
  return render(
    <RevenuCreateModal churches={CHURCHES} onClose={onClose} onCreated={onCreated} />,
  );
}

/**
 * Le montant porte `required` et `min="0.01"` : la validation native de jsdom
 * bloquerait un clic sur « Ajouter » avant que la garde JS — le sujet du test
 * de validation — ne s'exécute. On soumet donc le formulaire directement.
 */
function submitForm(container: HTMLElement) {
  fireEvent.submit(container.querySelector("form")!);
}

beforeEach(() => {
  vi.clearAllMocks();
  createManualDonation.mockResolvedValue({ id: 7 });
  fetchMembers.mockResolvedValue({ items: [] });
  searchDonors.mockResolvedValue([]);
});

describe("RevenuCreateModal — rendu", () => {
  it("affiche le formulaire de saisie manuelle", () => {
    renderModal();
    expect(screen.getByText("Nouveau revenu")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Montant *")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anonyme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Membre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Donateur" })).toBeInTheDocument();
  });

  it("propose les trois types de contribution", () => {
    renderModal();
    expect(screen.getByRole("option", { name: "Don" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dîme" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Offrande" })).toBeInTheDocument();
  });

  it("propose les églises reçues en propriété", () => {
    renderModal();
    expect(screen.getByRole("option", { name: "Église centrale" })).toBeInTheDocument();
  });

  it("n'affiche les champs du donateur anonyme qu'en mode anonyme", () => {
    renderModal();
    expect(screen.getByPlaceholderText("Nom du donateur (optionnel)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Membre" }));
    expect(screen.queryByPlaceholderText("Nom du donateur (optionnel)")).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Rechercher un membre (nom, courriel)…"),
    ).toBeInTheDocument();
  });
});

describe("RevenuCreateModal — soumission", () => {
  it("refuse un montant nul et n'appelle pas l'API", async () => {
    const { container } = renderModal();
    submitForm(container);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Montant et type de contribution sont requis.",
    );
    expect(createManualDonation).not.toHaveBeenCalled();
  });

  it("enregistre un don anonyme puis referme la modale", async () => {
    const { container } = renderModal();

    fireEvent.change(screen.getByPlaceholderText("Montant *"), { target: { value: "50" } });
    fireEvent.change(screen.getByPlaceholderText("Nom du donateur (optionnel)"), {
      target: { value: "  Marie  " },
    });
    submitForm(container);

    await waitFor(() => expect(createManualDonation).toHaveBeenCalledTimes(1));
    expect(createManualDonation).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        currency: "CAD",
        contribution_type: "don",
        donor_name: "Marie",
        member_id: undefined,
        donor_id: undefined,
      }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rattache le don au membre sélectionné", async () => {
    fetchMembers.mockResolvedValue({
      items: [{ id: 3, first_name: "Jean", last_name: "Dupont", email: "jean@ex.ca" }],
    });
    const { container } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Membre" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    fireEvent.click(await screen.findByRole("button", { name: /Jean Dupont/ }));

    fireEvent.change(screen.getByPlaceholderText("Montant *"), { target: { value: "25" } });
    submitForm(container);

    await waitFor(() => expect(createManualDonation).toHaveBeenCalledTimes(1));
    expect(createManualDonation).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 25, member_id: 3, donor_name: undefined }),
    );
  });

  it("remonte l'erreur du serveur sans refermer la modale", async () => {
    createManualDonation.mockImplementation(() => Promise.reject(new Error("Montant refusé")));
    const { container } = renderModal();

    fireEvent.change(screen.getByPlaceholderText("Montant *"), { target: { value: "10" } });
    submitForm(container);

    expect(await screen.findByRole("alert")).toHaveTextContent("Montant refusé");
    expect(onClose).not.toHaveBeenCalled();
  });
});
