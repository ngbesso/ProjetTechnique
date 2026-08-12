import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { makeGlobalAdminUser, makeMember, makeMemberUser, makeOrganiserUser } from "../../test/factories";

const login = vi.fn();
const fetchMyProfile = vi.fn();
const navigate = vi.fn();
const setMember = vi.fn();

vi.mock("../../lib/api/auth", () => ({ login: (...a: unknown[]) => login(...a) }));
vi.mock("../../lib/api/members", () => ({ fetchMyProfile: () => fetchMyProfile() }));
vi.mock("../../lib/api/content", () => ({ siteLogoUrl: () => null }));

vi.mock("../../context/RouterContext", () => ({
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("../../components/layout/SiteFooter", () => ({ SiteFooter: () => null }));

vi.mock("../../hooks/useSiteContent", () => ({
  useSiteContent: () => ({ settings: { site_name: "EENOJEC", site_tagline: "", site_logo_url: "" }, menu: [] }),
}));

vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({
    user: null,
    member: null,
    loading: false,
    setUser: vi.fn(),
    setMember,
    logout: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyProfile.mockResolvedValue(makeMember());
});

/** Remplit et soumet le formulaire de connexion. */
function submitLogin() {
  fireEvent.change(screen.getByLabelText("Adresse courriel"), {
    target: { value: "personne@exemple.com" },
  });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "secret123" } });
  fireEvent.submit(document.querySelector("form")!);
}

describe("LoginPage — destination après connexion", () => {
  it("dirige un membre vers son espace", async () => {
    login.mockResolvedValue(makeMemberUser());
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("espace"));
  });

  it("dirige un administrateur vers l'administration", async () => {
    login.mockResolvedValue(makeGlobalAdminUser());
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("admin"));
    // Le profil n'est même pas demandé : la destination est déjà tranchée.
    expect(fetchMyProfile).not.toHaveBeenCalled();
  });

  it("laisse sur l'accueil un compte sans fiche membre", async () => {
    // Cas de l'organisateur : il n'a pas de fiche membre.
    login.mockResolvedValue(makeOrganiserUser());
    fetchMyProfile.mockImplementation(() => Promise.reject(new Error("404")));
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("home"));
  });

  it("dirige vers l'administration un admin qui a aussi une fiche membre", async () => {
    login.mockResolvedValue(makeGlobalAdminUser());
    fetchMyProfile.mockResolvedValue(makeMember());
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("admin"));
    expect(navigate).not.toHaveBeenCalledWith("espace");
  });

  it("pousse la fiche membre dans le contexte", async () => {
    const member = makeMember();
    login.mockResolvedValue(makeMemberUser());
    fetchMyProfile.mockResolvedValue(member);
    render(<LoginPage />);
    submitLogin();

    await waitFor(() => expect(setMember).toHaveBeenCalledWith(member));
  });
});

describe("LoginPage — échec de connexion", () => {
  it("affiche l'erreur et ne navigue pas", async () => {
    login.mockImplementation(() => Promise.reject(new Error("Identifiants invalides")));
    render(<LoginPage />);
    submitLogin();

    expect(await screen.findByRole("alert")).toHaveTextContent("Identifiants invalides");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("réactive le bouton après un échec", async () => {
    login.mockImplementation(() => Promise.reject(new Error("Erreur")));
    render(<LoginPage />);
    submitLogin();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Se connecter" })).not.toBeDisabled();
  });
});
