import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembresPanel } from "./MembresPanel";
import { makeGlobalAdminUser, makeMember, makeUser } from "../../test/factories";
import type { Member, UserInfo } from "../../types";

const load = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
const deactivate = vi.fn();
const activate = vi.fn();
const edit = vi.fn();

let members: Member[] = [];

vi.mock("../../hooks/useMembers", () => ({
  useMembers: () => ({
    members,
    total: members.length,
    loading: false,
    error: "",
    load,
    approve,
    reject,
    deactivate,
    activate,
    edit,
  }),
}));

const loadChurches = vi.fn();
vi.mock("../../hooks/useChurches", () => ({
  useChurches: () => ({ churches: [], load: loadChurches, loading: false, error: "" }),
}));

const loadParameters = vi.fn();
vi.mock("../../hooks/useParameters", () => ({
  useParameters: () => ({ values: [], loading: false, error: "", load: loadParameters }),
}));

vi.mock("../../lib/api/members", () => ({
  fetchMembersStats: () => Promise.resolve({ active: 2, pending: 1, inactive: 0, rejected: 0 }),
}));

vi.mock("./FamilyStatusBreakdown", () => ({ FamilyStatusBreakdown: () => null }));
vi.mock("./MemberImportSection", () => ({
  MemberImportSection: () => <div data-testid="import-section" />,
}));

let currentUser: UserInfo | null = null;
vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({
    user: currentUser,
    member: null,
    loading: false,
    setUser: vi.fn(),
    setMember: vi.fn(),
    logout: vi.fn(),
  }),
}));

/** Un utilisateur qui n'a que la lecture : ni approbation, ni import, ni édition. */
function makeReadOnlyUser(): UserInfo {
  return makeUser({ roles: ["lecteur"], permissions: ["member:read"] });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = makeGlobalAdminUser();
  members = [makeMember({ id: 1, first_name: "Marie", last_name: "Dupont", status: "active" })];
});

const searchBox = () => screen.getByPlaceholderText(/Rechercher \(nom, courriel\)/);

describe("MembresPanel — filtres", () => {
  it("relance la recherche à chaque frappe", () => {
    render(<MembresPanel />);
    fireEvent.change(searchBox(), { target: { value: "Dup" } });
    expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Dup" }));
  });

  it("filtre par statut", () => {
    render(<MembresPanel />);
    // Deux listes déroulantes dans la barre d'outils : statut puis statut
    // matrimonial. Les libellés ne sont pas reliés aux contrôles.
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "pending" } });
    expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ status: "pending" }));
  });

  it("combine recherche et statut", () => {
    render(<MembresPanel />);
    fireEvent.change(searchBox(), { target: { value: "Dup" } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "active" } });

    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "Dup", status: "active" }),
    );
  });

  it("repart sans filtre quand la recherche est vidée", () => {
    render(<MembresPanel />);
    fireEvent.change(searchBox(), { target: { value: "Dup" } });
    fireEvent.change(searchBox(), { target: { value: "" } });
    expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ q: undefined }));
  });

  it("applique le statut initial reçu en propriété", () => {
    render(<MembresPanel initialStatus="pending" />);
    expect(load).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
  });
});

describe("MembresPanel — import réservé à la permission de création", () => {
  it("propose l'import à qui peut créer des membres", () => {
    render(<MembresPanel />);
    expect(screen.getByTestId("import-section")).toBeInTheDocument();
  });

  it("masque l'import à un profil en lecture seule", () => {
    currentUser = makeReadOnlyUser();
    render(<MembresPanel />);
    expect(screen.queryByTestId("import-section")).not.toBeInTheDocument();
  });
});

describe("MembresPanel — actions selon les permissions", () => {
  it("propose approbation et refus sur une demande en attente", () => {
    members = [makeMember({ id: 1, status: "pending" })];
    render(<MembresPanel />);

    expect(screen.getByRole("button", { name: "Approuver" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
  });

  it("propose la désactivation d'un membre actif", () => {
    members = [makeMember({ id: 1, status: "active" })];
    render(<MembresPanel />);
    expect(screen.getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
  });

  it("propose la réactivation d'un membre inactif", () => {
    members = [makeMember({ id: 1, status: "inactive" })];
    render(<MembresPanel />);
    expect(screen.getByRole("button", { name: "Activer" })).toBeInTheDocument();
  });

  it("retire toutes les actions de gestion à un profil en lecture seule", () => {
    currentUser = makeReadOnlyUser();
    members = [makeMember({ id: 1, status: "pending" })];
    render(<MembresPanel />);

    expect(screen.queryByRole("button", { name: "Approuver" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    // La consultation reste possible.
    expect(screen.getByRole("button", { name: "Voir" })).toBeInTheDocument();
  });

  it("approuve un membre après confirmation implicite", async () => {
    members = [makeMember({ id: 42, status: "pending" })];
    approve.mockResolvedValue(undefined);
    render(<MembresPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Approuver" }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith(42));
  });

  it("demande confirmation avant de refuser", async () => {
    members = [makeMember({ id: 42, status: "pending" })];
    render(<MembresPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    // Une modale s'interpose : rien n'est envoyé tant qu'elle n'est pas validée.
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(reject).not.toHaveBeenCalled();
  });

  it("refuse effectivement une fois la confirmation validée", async () => {
    members = [makeMember({ id: 42, status: "pending" })];
    reject.mockResolvedValue(undefined);
    render(<MembresPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Refuser" }));

    await waitFor(() => expect(reject).toHaveBeenCalledWith(42));
  });
});
