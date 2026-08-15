import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RapportPanel } from "./RapportPanel";
import type { FinanceReport } from "../../types";

const fetchFinanceReport = vi.fn();

vi.mock("../../lib/api/finances", () => ({
  fetchFinanceReport: (...args: unknown[]) => fetchFinanceReport(...args),
  downloadFinanceReport: vi.fn(),
  downloadTransactionAttachment: vi.fn(),
  fetchAnnualDonorReport: vi.fn(() => Promise.resolve({ year: 2026, generated_at: "", entries: [] })),
  downloadAnnualDonorReport: vi.fn(),
}));

const REPORT: FinanceReport = {
  period_start: "2026-08-01",
  period_end: "2026-08-14",
  income_cad: 175,
  income_usd: 0,
  expenses_total: 40,
  balance: 135,
  income_count: 2,
  expense_count: 1,
  transactions: [
    {
      date: "2026-08-10",
      type: "revenu",
      category: "soutien_spirituel",
      amount: 100,
      currency: "CAD",
      party: "Jean Dupont",
      note: "REC-AAA",
      attachment_url: null,
    },
    {
      date: "2026-08-05",
      type: "revenu",
      category: "soutien_spirituel",
      amount: 75,
      currency: "CAD",
      party: "Marie Curie",
      note: "REC-BBB",
      attachment_url: null,
    },
    {
      date: "2026-08-02",
      type: "dépense",
      category: "Loyer et charges",
      amount: 40,
      currency: "CAD",
      party: "admin@obnl.org",
      note: "Loyer du mois",
      attachment_url: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchFinanceReport.mockResolvedValue(REPORT);
});

async function renderOnCategoriesView() {
  render(<RapportPanel />);
  await waitFor(() => expect(fetchFinanceReport).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole("button", { name: "Vue par catégories" }));
}

describe("RapportPanel — vue par catégories", () => {
  it("regroupe les transactions par catégorie avec un sous-total", async () => {
    await renderOnCategoriesView();

    const revenueRow = await screen.findByRole("button", { name: /Soutien spirituel/ });
    expect(within(revenueRow).getByText("175.00 $ CAD")).toBeInTheDocument();
    expect(within(revenueRow).getByText("(2)")).toBeInTheDocument();
  });

  it("affiche le détail des transactions au clic sur une catégorie", async () => {
    await renderOnCategoriesView();

    fireEvent.click(await screen.findByRole("button", { name: /Soutien spirituel/ }));

    expect(screen.getByText(/Détails — Soutien spirituel/)).toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Marie Curie")).toBeInTheDocument();
    // La dépense d'une autre catégorie ne doit pas apparaître dans le détail.
    expect(screen.queryByText("admin@obnl.org")).not.toBeInTheDocument();
  });

  it("referme le détail au second clic sur la même catégorie", async () => {
    await renderOnCategoriesView();

    const button = await screen.findByRole("button", { name: /Soutien spirituel/ });
    fireEvent.click(button);
    expect(screen.getByText(/Détails — Soutien spirituel/)).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByText(/Détails — Soutien spirituel/)).not.toBeInTheDocument();
  });

  it("referme le détail via le bouton Fermer", async () => {
    await renderOnCategoriesView();

    fireEvent.click(await screen.findByRole("button", { name: /Soutien spirituel/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByText(/Détails — Soutien spirituel/)).not.toBeInTheDocument();
  });
});