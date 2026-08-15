import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnualDonorReportView } from "./AnnualDonorReportView";
import type { DonorAnnualReport } from "../../types";

const fetchAnnualDonorReport = vi.fn();
const downloadAnnualDonorReport = vi.fn();

vi.mock("../../lib/api/finances", () => ({
  fetchAnnualDonorReport: (...args: unknown[]) => fetchAnnualDonorReport(...args),
  downloadAnnualDonorReport: (...args: unknown[]) => downloadAnnualDonorReport(...args),
}));

const REPORT: DonorAnnualReport = {
  year: 2026,
  generated_at: "2026-08-15T00:00:00Z",
  entries: [
    {
      donor_name: "Daniel Kabongo",
      donor_email: "daniel.kabongo@example.com",
      member_id: 14,
      donor_id: null,
      currency: "CAD",
      monthly_totals: [0, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0],
      annual_total: 200,
      donation_count: 1,
    },
    {
      donor_name: "Fondation Lumière",
      donor_email: "dons@fondation-lumiere.org",
      member_id: null,
      donor_id: 1,
      currency: "CAD",
      monthly_totals: [0, 0, 0, 0, 0, 0, 500, 0, 0, 0, 0, 0],
      annual_total: 500,
      donation_count: 1,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchAnnualDonorReport.mockResolvedValue(REPORT);
  downloadAnnualDonorReport.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

describe("AnnualDonorReportView — rapport individuel", () => {
  it("propose le téléchargement individuel pour un membre inscrit, pas pour un donateur externe", async () => {
    render(<AnnualDonorReportView />);
    await waitFor(() => expect(fetchAnnualDonorReport).toHaveBeenCalled());

    const memberRow = (await screen.findByText("Daniel Kabongo")).closest("tr")!;
    expect(within(memberRow).getByRole("button", { name: "📄 PDF" })).toBeInTheDocument();

    const donorRow = screen.getByText("Fondation Lumière").closest("tr")!;
    expect(within(donorRow).queryByRole("button", { name: "📄 PDF" })).not.toBeInTheDocument();
    // Dernière colonne = "Rapport individuel" : un "—" y confirme l'absence
    // volontaire de bouton (d'autres cellules du mois affichent aussi "—").
    const cells = within(donorRow).getAllByRole("cell");
    expect(cells[cells.length - 1]).toHaveTextContent("—");
  });

  it("télécharge le PDF individuel avec le member_id de la ligne cliquée", async () => {
    render(<AnnualDonorReportView />);
    await waitFor(() => expect(fetchAnnualDonorReport).toHaveBeenCalled());

    const memberRow = (await screen.findByText("Daniel Kabongo")).closest("tr")!;
    fireEvent.click(within(memberRow).getByRole("button", { name: "📄 PDF" }));

    await waitFor(() =>
      expect(downloadAnnualDonorReport).toHaveBeenCalledWith("pdf", 2026, 14),
    );
  });
});