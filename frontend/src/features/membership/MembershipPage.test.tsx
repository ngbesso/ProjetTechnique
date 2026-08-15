import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipPage } from "./MembershipPage";
import { makeMember, makeMemberUser } from "../../test/factories";
import type { UserInfo } from "../../types";

const requestMembership = vi.fn();

vi.mock("../../lib/api/members", () => ({
  requestMembership: (...args: unknown[]) => requestMembership(...args),
}));

vi.mock("../../lib/api/settings", () => ({
  fetchPublicSettings: () => Promise.resolve({}),
}));

// Le formulaire n'est pas le sujet de l'en-tête ni du pied de page : on les
// neutralise pour ne pas embarquer leurs propres dépendances.
vi.mock("../../components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("../../components/layout/SiteFooter", () => ({ SiteFooter: () => null }));

vi.mock("../../context/RouterContext", () => ({ useNavigate: () => vi.fn() }));

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

vi.mock("../../hooks/useChurches", () => ({
  useChurches: () => ({
    churches: [
      { id: 7, name: "Église centrale", district: "Centre", is_mother: true, is_active: true, parent_id: null },
    ],
    load: vi.fn(),
    loading: false,
    error: "",
  }),
}));

vi.mock("../../hooks/useParameters", () => ({
  useParameters: () => ({ values: [], loading: false, error: "", load: vi.fn() }),
}));

// ── Utilitaires de saisie ────────────────────────────────────────────────────
// Les libellés du formulaire ne sont pas reliés aux champs par htmlFor/id :
// on cible donc par rôle et par placeholder.

function form(): HTMLFormElement {
  const el = document.querySelector("form");
  if (!el) throw new Error("Formulaire introuvable");
  return el;
}

function churchSelect() {
  return screen.getAllByRole("combobox")[0];
}

function textboxes() {
  return screen.getAllByRole("textbox") as HTMLInputElement[];
}

/** Remplit le minimum requis : église, prénom, nom, courriel. */
function fillRequired() {
  fireEvent.change(churchSelect(), { target: { value: "7" } });
  const [firstName, lastName] = textboxes();
  fireEvent.change(firstName, { target: { value: "Marie" } });
  fireEvent.change(lastName, { target: { value: "Dupont" } });
  fireEvent.change(screen.getByPlaceholderText("vous@exemple.com"), {
    target: { value: "marie@exemple.com" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = null;
  requestMembership.mockResolvedValue(makeMember({ status: "pending" }));
});

describe("MembershipPage — champs requis", () => {
  it("refuse l'envoi sans église et l'explique", async () => {
    render(<MembershipPage />);
    fireEvent.submit(form());

    expect(await screen.findByText("Veuillez choisir une église.")).toBeInTheDocument();
    expect(requestMembership).not.toHaveBeenCalled();
  });

  it("marque église, prénom, nom et courriel comme obligatoires", () => {
    render(<MembershipPage />);
    expect(churchSelect()).toBeRequired();
    const [firstName, lastName] = textboxes();
    expect(firstName).toBeRequired();
    expect(lastName).toBeRequired();
    expect(screen.getByPlaceholderText("vous@exemple.com")).toBeRequired();
  });

  it("refuse un courriel mal formé", async () => {
    render(<MembershipPage />);
    fillRequired();
    fireEvent.change(screen.getByPlaceholderText("vous@exemple.com"), {
      target: { value: "pas-un-courriel" },
    });
    fireEvent.submit(form());

    await waitFor(() => expect(requestMembership).not.toHaveBeenCalled());
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("refuse une date de naissance qui n'est pas antérieure à aujourd'hui", async () => {
    render(<MembershipPage />);
    fillRequired();
    const today = new Date().toISOString().split("T")[0];
    const birthDate = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(birthDate, { target: { value: today } });
    fireEvent.submit(form());

    expect(
      await screen.findByText("La date de naissance doit être antérieure à aujourd'hui."),
    ).toBeInTheDocument();
    expect(requestMembership).not.toHaveBeenCalled();
  });
});

describe("MembershipPage — envoi et confirmation", () => {
  it("transmet les champs saisis, en omettant les optionnels vides", async () => {
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    await waitFor(() =>
      expect(requestMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          church_id: 7,
          first_name: "Marie",
          last_name: "Dupont",
          email: "marie@exemple.com",
          address: undefined,
          birth_date: undefined,
          is_baptized: false,
        }),
      ),
    );
  });

  it("confirme une demande en attente d'approbation", async () => {
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    expect(await screen.findByText("Demande envoyée")).toBeInTheDocument();
    expect(screen.getByText("Église centrale")).toBeInTheDocument();
  });

  it("confirme différemment une adhésion approuvée automatiquement", async () => {
    requestMembership.mockResolvedValue(makeMember({ status: "active" }));
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    expect(await screen.findByText("Adhésion approuvée !")).toBeInTheDocument();
  });

  it("affiche l'erreur du serveur et garde le formulaire ouvert", async () => {
    requestMembership.mockRejectedValue(new Error("Cette adresse est déjà utilisée."));
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    expect(await screen.findByText("Cette adresse est déjà utilisée.")).toBeInTheDocument();
    expect(screen.queryByText("Demande envoyée")).not.toBeInTheDocument();
  });
});

describe("MembershipPage — validation des champs optionnels", () => {
  it("refuse un téléphone trop court", async () => {
    render(<MembershipPage />);
    fillRequired();
    const phone = document.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "123" } });
    fireEvent.submit(form());

    await waitFor(() => expect(requestMembership).not.toHaveBeenCalled());
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("accepte un téléphone valide", async () => {
    render(<MembershipPage />);
    fillRequired();
    const phone = document.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "514-555-0100" } });
    fireEvent.submit(form());

    await waitFor(() =>
      expect(requestMembership).toHaveBeenCalledWith(
        expect.objectContaining({ telephone: "514-555-0100" }),
      ),
    );
  });

  it("efface l'erreur de champ dès la correction", async () => {
    render(<MembershipPage />);
    fillRequired();
    const phone = document.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "123" } });
    fireEvent.submit(form());
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));

    fireEvent.change(phone, { target: { value: "514-555-0100" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("n'envoie pas une adresse laissée vide", async () => {
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    await waitFor(() =>
      expect(requestMembership).toHaveBeenCalledWith(
        expect.objectContaining({ address: undefined, telephone: undefined }),
      ),
    );
  });

  it("nettoie les espaces autour des champs requis", async () => {
    render(<MembershipPage />);
    fireEvent.change(churchSelect(), { target: { value: "7" } });
    const [firstName, lastName] = textboxes();
    fireEvent.change(firstName, { target: { value: "  Marie  " } });
    fireEvent.change(lastName, { target: { value: "  Dupont  " } });
    fireEvent.change(screen.getByPlaceholderText("vous@exemple.com"), {
      target: { value: "  marie@exemple.com  " },
    });
    fireEvent.submit(form());

    await waitFor(() =>
      expect(requestMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "Marie",
          last_name: "Dupont",
          email: "marie@exemple.com",
        }),
      ),
    );
  });
});

describe("MembershipPage — cas d'erreur de soumission", () => {
  it("réactive le bouton après un échec, pour permettre un nouvel essai", async () => {
    requestMembership.mockRejectedValue(new Error("Serveur indisponible"));
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    await screen.findByText("Serveur indisponible");
    const submit = screen.getByRole("button", { name: /Envoyer|Devenir membre|Soumettre/ });
    expect(submit).not.toBeDisabled();
  });

  it("permet de renvoyer après correction d'un conflit de courriel", async () => {
    requestMembership.mockRejectedValueOnce(new Error("Cette adresse est déjà utilisée."));
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());
    await screen.findByText("Cette adresse est déjà utilisée.");

    requestMembership.mockResolvedValue(makeMember({ status: "pending" }));
    fireEvent.change(screen.getByPlaceholderText("vous@exemple.com"), {
      target: { value: "autre@exemple.com" },
    });
    fireEvent.submit(form());

    expect(await screen.findByText("Demande envoyée")).toBeInTheDocument();
  });

  it("affiche un message générique si l'erreur n'en porte pas", async () => {
    requestMembership.mockRejectedValue({ code: 500 });
    render(<MembershipPage />);
    fillRequired();
    fireEvent.submit(form());

    expect(await screen.findByText("Une erreur est survenue.")).toBeInTheDocument();
  });
});

describe("MembershipPage — visiteur déjà connecté", () => {
  it("propose l'espace membre au lieu du formulaire", () => {
    currentUser = makeMemberUser();
    render(<MembershipPage />);

    expect(screen.getByText(/Vous êtes déjà membre/)).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();
  });
});
