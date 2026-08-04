import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DonsSection } from "./DonsSection";
import type { Donation } from "../../types";

const fetchMyDonations = vi.fn();

vi.mock("../../lib/api/donations", () => ({
  fetchMyDonations: () => fetchMyDonations(),
  createDonation: vi.fn(),
}));

const navigate = vi.fn();
vi.mock("../../context/RouterContext", () => ({ useNavigate: () => navigate }));

const CURRENT_YEAR = new Date().getFullYear();

function makeDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 1,
    receipt_number: "R-001",
    amount: 100,
    currency: "CAD",
    category: "soutien_spirituel",
    contribution_type: "don",
    church_id: 1,
    member_id: 10,
    donor_id: null,
    donor_name: null,
    donor_email: null,
    payment_reference: null,
    payment_status: "manual",
    attachment_url: null,
    attachment_name: null,
    created_at: `${CURRENT_YEAR}-03-01T10:00:00Z`,
    ...overrides,
  } as Donation;
}

const churchName = () => "Église centrale";

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyDonations.mockResolvedValue([]);
});

async function renderSection() {
  render(<DonsSection churchName={churchName} />);
  await waitFor(() => expect(fetchMyDonations).toHaveBeenCalled());
}

describe("DonsSection — total de l'année", () => {
  it("invite à donner quand l'historique est vide", async () => {
    await renderSection();
    expect(await screen.findByText("Aucun don cette année.")).toBeInTheDocument();
    expect(screen.getByText("Aucun don pour le moment.")).toBeInTheDocument();
  });

  it("additionne les dons de l'année en cours", async () => {
    fetchMyDonations.mockResolvedValue([
      makeDonation({ id: 1, amount: 100 }),
      makeDonation({ id: 2, amount: 50.5 }),
    ]);
    await renderSection();
    expect(await screen.findByText(/150,50/)).toBeInTheDocument();
  });

  it("exclut du total les dons des années précédentes", async () => {
    fetchMyDonations.mockResolvedValue([
      makeDonation({ id: 1, amount: 100, created_at: `${CURRENT_YEAR}-03-01T10:00:00Z` }),
      makeDonation({ id: 2, amount: 999, created_at: `${CURRENT_YEAR - 1}-03-01T10:00:00Z` }),
    ]);
    await renderSection();

    expect(await screen.findByText(/100,00/)).toBeInTheDocument();
    expect(screen.queryByText(/1 099/)).not.toBeInTheDocument();
    // Le don ancien reste visible dans l'historique, seul le total l'ignore.
    expect(screen.getByText("Historique des dons (2)")).toBeInTheDocument();
  });

  it("sépare les totaux par devise", async () => {
    fetchMyDonations.mockResolvedValue([
      makeDonation({ id: 1, amount: 100, currency: "CAD" }),
      makeDonation({ id: 2, amount: 40, currency: "USD" }),
    ]);
    await renderSection();
    expect(await screen.findByText(/100,00/)).toBeInTheDocument();
    expect(screen.getByText(/40,00/)).toBeInTheDocument();
  });
});

describe("DonsSection — historique", () => {
  it("affiche église, catégorie traduite et montant", async () => {
    fetchMyDonations.mockResolvedValue([makeDonation({ category: "action_communautaire" })]);
    await renderSection();

    expect(await screen.findByText("Église centrale")).toBeInTheDocument();
    expect(screen.getByText("Action communautaire")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
  });

  it("remplace une catégorie absente par un tiret", async () => {
    fetchMyDonations.mockResolvedValue([makeDonation({ category: null })]);
    await renderSection();
    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("affiche telle quelle une catégorie inconnue du libellé", async () => {
    fetchMyDonations.mockResolvedValue([
      makeDonation({ category: "categorie_future" as Donation["category"] }),
    ]);
    await renderSection();
    expect(await screen.findByText("categorie_future")).toBeInTheDocument();
  });

  it("compte les dons dans le titre de l'historique", async () => {
    fetchMyDonations.mockResolvedValue([makeDonation({ id: 1 }), makeDonation({ id: 2 })]);
    await renderSection();
    expect(await screen.findByText("Historique des dons (2)")).toBeInTheDocument();
  });
});
