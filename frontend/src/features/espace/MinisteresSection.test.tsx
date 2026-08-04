import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MinisteresSection } from "./MinisteresSection";
import { makeMember } from "../../test/factories";
import type { Member, MinistryAffiliation } from "../../types";

const fetchMyMinistries = vi.fn();
const joinMinistry = vi.fn();
const leaveMinistry = vi.fn();

vi.mock("../../lib/api/ministryAffiliations", () => ({
  fetchMyMinistries: () => fetchMyMinistries(),
  joinMinistry: (...args: unknown[]) => joinMinistry(...args),
  leaveMinistry: (...args: unknown[]) => leaveMinistry(...args),
}));

// Le sexe du membre décide quels ministères restreints lui sont proposés.
let currentMember: Member | null = makeMember({ sexe: "Femme" });

vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({
    user: null,
    member: currentMember,
    loading: false,
    setUser: vi.fn(),
    setMember: vi.fn(),
    logout: vi.fn(),
  }),
}));

const MINISTRIES = [
  { id: 1, category: "ministry", label: "Louange", position: 0, restricted_to_sexe: null },
  { id: 2, category: "ministry", label: "Accueil", position: 1, restricted_to_sexe: null },
  { id: 3, category: "ministry", label: "Femmes de foi", position: 2, restricted_to_sexe: "Femme" },
  { id: 4, category: "ministry", label: "Hommes forts", position: 3, restricted_to_sexe: "Homme" },
];

// `load` doit garder la même identité entre deux rendus : le vrai hook le
// mémoïse avec useCallback, et il figure dans les dépendances d'un useEffect.
// Une nouvelle fonction à chaque rendu relancerait l'effet en boucle.
const loadMinistries = vi.fn();

vi.mock("../../hooks/useParameters", () => ({
  useParameters: () => ({
    values: MINISTRIES,
    loading: false,
    error: "",
    load: loadMinistries,
  }),
}));

function makeAffiliation(overrides: Partial<MinistryAffiliation> = {}): MinistryAffiliation {
  return {
    id: 1,
    member_id: 10,
    ministry: "Louange",
    joined_at: "2026-01-15",
    left_at: null,
    ...overrides,
  } as MinistryAffiliation;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentMember = makeMember({ sexe: "Femme" });
  fetchMyMinistries.mockResolvedValue([]);
  joinMinistry.mockResolvedValue(makeAffiliation());
  leaveMinistry.mockResolvedValue(undefined);
});

async function renderSection() {
  render(<MinisteresSection />);
  await waitFor(() => expect(fetchMyMinistries).toHaveBeenCalled());
}

describe("MinisteresSection — ministères restreints par sexe", () => {
  it("ne propose pas un ministère réservé à l'autre sexe", async () => {
    await renderSection();
    expect(await screen.findByRole("button", { name: /Femmes de foi/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hommes forts/ })).not.toBeInTheDocument();
  });

  it("inverse la restriction pour un membre de l'autre sexe", async () => {
    currentMember = makeMember({ sexe: "Homme" });
    await renderSection();
    expect(await screen.findByRole("button", { name: /Hommes forts/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Femmes de foi/ })).not.toBeInTheDocument();
  });

  it("masque tous les ministères restreints quand le sexe n'est pas renseigné", async () => {
    currentMember = makeMember({ sexe: null });
    await renderSection();
    expect(await screen.findByRole("button", { name: /Louange/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Femmes de foi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hommes forts/ })).not.toBeInTheDocument();
  });

  it("propose toujours les ministères sans restriction", async () => {
    await renderSection();
    expect(await screen.findByRole("button", { name: /Louange/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accueil/ })).toBeInTheDocument();
  });
});

describe("MinisteresSection — auto-affiliation", () => {
  it("rejoint un ministère et recharge la liste", async () => {
    await renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /Louange/ }));

    await waitFor(() => expect(joinMinistry).toHaveBeenCalledWith("Louange"));
    // Un rechargement suit l'adhésion, pour refléter la nouvelle affiliation.
    await waitFor(() => expect(fetchMyMinistries).toHaveBeenCalledTimes(2));
  });

  it("ne propose plus un ministère déjà rejoint", async () => {
    fetchMyMinistries.mockResolvedValue([makeAffiliation({ ministry: "Louange" })]);
    await renderSection();

    expect(await screen.findByText(/depuis le/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+ Louange/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accueil/ })).toBeInTheDocument();
  });

  it("propose de nouveau un ministère quitté", async () => {
    // left_at renseigné : l'affiliation est close, le ministère redevient offert.
    fetchMyMinistries.mockResolvedValue([
      makeAffiliation({ ministry: "Louange", left_at: "2026-03-01" }),
    ]);
    await renderSection();
    expect(await screen.findByRole("button", { name: /\+ Louange/ })).toBeInTheDocument();
  });

  it("quitte un ministère actif", async () => {
    fetchMyMinistries.mockResolvedValue([makeAffiliation({ id: 42, ministry: "Louange" })]);
    await renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Quitter" }));
    await waitFor(() => expect(leaveMinistry).toHaveBeenCalledWith(42));
  });

  it("affiche la date d'adhésion sans décalage de fuseau", async () => {
    fetchMyMinistries.mockResolvedValue([makeAffiliation({ joined_at: "2026-01-15" })]);
    await renderSection();
    expect(await screen.findByText(/15 janvier 2026/)).toBeInTheDocument();
  });

  it("remonte l'erreur du serveur si l'adhésion échoue", async () => {
    joinMinistry.mockRejectedValue(new Error("Ministère réservé"));
    await renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /Louange/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ministère réservé");
  });

  it("signale quand tous les ministères disponibles sont déjà rejoints", async () => {
    fetchMyMinistries.mockResolvedValue([
      makeAffiliation({ id: 1, ministry: "Louange" }),
      makeAffiliation({ id: 2, ministry: "Accueil" }),
      makeAffiliation({ id: 3, ministry: "Femmes de foi" }),
    ]);
    await renderSection();
    expect(await screen.findByText(/déjà à tous les ministères disponibles/)).toBeInTheDocument();
  });
});
