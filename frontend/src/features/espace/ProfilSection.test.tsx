import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilSection } from "./ProfilSection";
import { makeMember } from "../../test/factories";
import type { Member } from "../../types";

const fetchMyProfile = vi.fn();
const updateMyProfile = vi.fn();

vi.mock("../../lib/api/members", () => ({
  fetchMyProfile: (...args: unknown[]) => fetchMyProfile(...args),
  updateMyProfile: (...args: unknown[]) => updateMyProfile(...args),
}));

vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({
    user: null,
    member: null,
    loading: false,
    setUser: vi.fn(),
    setMember: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../../hooks/useParameters", () => ({
  useParameters: () => ({
    values: [{ id: 1, category: "family_status", label: "Mariée", position: 0, restricted_to_sexe: null }],
    loading: false,
    error: "",
    load: vi.fn(),
  }),
}));

const churchName = () => "Église centrale";

async function renderProfil(member: Member) {
  fetchMyProfile.mockResolvedValue(member);
  render(<ProfilSection churchName={churchName} onRequestChange={vi.fn()} />);
  await waitFor(() => expect(screen.getByText("Informations personnelles")).toBeInTheDocument());
}

beforeEach(() => vi.clearAllMocks());

describe("ProfilSection — champs verrouillés", () => {
  it("affiche l'identité en lecture seule, sans champ de saisie", async () => {
    await renderProfil(makeMember());

    for (const label of ["Prénom", "Nom", "Date de naissance", "Courriel", "Sexe"]) {
      // Un champ verrouillé n'a pas de contrôle associé : getByLabelText
      // échouerait s'il en existait un. On vérifie donc le libellé et la valeur.
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
    expect(screen.getByText("Marie")).toBeInTheDocument();
    expect(screen.getByText("Dupont")).toBeInTheDocument();
    expect(screen.getByText("marie@exemple.com")).toBeInTheDocument();
  });

  it("formate la date de naissance sans décalage de fuseau", async () => {
    await renderProfil(makeMember({ birth_date: "1990-06-15" }));
    // `new Date("1990-06-15")` vaudrait minuit UTC, soit le 14 juin en heure
    // de Montréal : formatLongDate reconstruit la date en heure locale.
    expect(screen.getByText("15 juin 1990")).toBeInTheDocument();
  });

  it("affiche le statut du compte et le numéro de membre en lecture seule", async () => {
    await renderProfil(makeMember());
    expect(screen.getAllByText("MBR-2026-0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Actif").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Église centrale").length).toBeGreaterThan(0);
    expect(screen.getByText("Oui")).toBeInTheDocument();
  });

  it("remplace une valeur absente par un tiret", async () => {
    await renderProfil(makeMember({ member_code: null, birth_date: null, sexe: null }));
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("laisse modifiables les seules coordonnées", async () => {
    await renderProfil(makeMember());
    expect(screen.getByLabelText("Adresse")).toHaveValue("12 rue des Lilas");
    expect(screen.getByLabelText("Téléphone")).toHaveValue("514-555-0100");
    expect(screen.getByLabelText("Statut matrimonial")).toBeInTheDocument();
    // L'identité, elle, n'est associée à aucun contrôle de formulaire.
    expect(screen.queryByLabelText("Prénom")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Courriel")).not.toBeInTheDocument();
  });

  it("signale l'absence de fiche membre plutôt que d'afficher un formulaire vide", async () => {
    fetchMyProfile.mockRejectedValue(new Error("404"));
    render(<ProfilSection churchName={churchName} onRequestChange={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Aucune fiche membre/),
    );
  });
});
