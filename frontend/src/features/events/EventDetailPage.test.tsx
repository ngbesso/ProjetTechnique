import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventDetailPage } from "./EventDetailPage";
import { makeMember } from "../../test/factories";
import type { EventItem, Member } from "../../types";

const getEvent = vi.fn();
const registerToEvent = vi.fn();
const cancelRegistration = vi.fn();
const fetchMyEventRegistrations = vi.fn();
const resendCancelLink = vi.fn();
const cancelRegistrationByToken = vi.fn();

vi.mock("../../lib/api/events", () => ({
  getEvent: (...args: unknown[]) => getEvent(...args),
  registerToEvent: (...args: unknown[]) => registerToEvent(...args),
  cancelRegistration: (...args: unknown[]) => cancelRegistration(...args),
  fetchMyEventRegistrations: () => fetchMyEventRegistrations(),
  resendCancelLink: (...args: unknown[]) => resendCancelLink(...args),
  cancelRegistrationByToken: (...args: unknown[]) => cancelRegistrationByToken(...args),
}));

vi.mock("../../components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("../../components/layout/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("../../context/RouterContext", () => ({ useNavigate: () => vi.fn() }));

let currentMember: Member | null = null;

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

/** Loin dans le futur : le délai d'annulation n'est jamais dépassé. */
const FAR_FUTURE = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
/** Dans 2 h : au-delà d'un délai d'annulation de 24 h. */
const SOON = new Date(Date.now() + 2 * 3_600_000).toISOString();

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 7,
    title: "Retraite de printemps",
    description: "Trois jours de ressourcement.",
    category: "Retraite",
    date_start: FAR_FUTURE,
    date_end: null,
    location: "Montréal",
    instructor: null,
    intervenant_category: null,
    price: null,
    zeffy_form_path: null,
    church_id: 1,
    district: null,
    capacity: null,
    show_registration_count: false,
    status: "published",
    format: "presentiel",
    online_link: null,
    cancel_deadline_hours: 24,
    confirmation_message: null,
    reminder_message: null,
    volunteer_capacity: null,
    volunteer_auto_approve: false,
    volunteer_message: null,
    created_by: null,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:00:00Z",
    registered_count: 0,
    spots_left: null,
    image_url: null,
    ...overrides,
  } as EventItem;
}

async function renderPage(event: EventItem = makeEvent()) {
  getEvent.mockResolvedValue(event);
  render(<EventDetailPage eventId={7} />);
  await screen.findByText(event.title);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentMember = null;
  fetchMyEventRegistrations.mockResolvedValue([]);
  registerToEvent.mockResolvedValue({ id: 1, online_link: null });
  cancelRegistration.mockResolvedValue(undefined);
});

// ── Invité sans compte ───────────────────────────────────────────────────────

describe("EventDetailPage — inscription d'un invité", () => {
  it("propose le formulaire sans compte", async () => {
    await renderPage();
    expect(screen.getByText("S'inscrire sans compte :")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Prénom *")).toBeInTheDocument();
  });

  it("transmet les coordonnées saisies, nettoyées", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("Prénom *"), { target: { value: " Marie " } });
    fireEvent.change(screen.getByPlaceholderText("Nom *"), { target: { value: " Dupont " } });
    fireEvent.change(screen.getByPlaceholderText("Courriel *"), {
      target: { value: " marie@exemple.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    await waitFor(() =>
      expect(registerToEvent).toHaveBeenCalledWith(7, {
        first_name: "Marie",
        last_name: "Dupont",
        email: "marie@exemple.com",
      }),
    );
  });

  it("refuse l'envoi tant qu'un champ requis est vide", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("Prénom *"), { target: { value: "Marie" } });
    // L'attribut `required` bloque déjà la soumission par clic : on soumet le
    // formulaire directement pour atteindre le garde-fou JS, qui est le filet
    // de sécurité si la validation native est contournée.
    fireEvent.submit(screen.getByPlaceholderText("Prénom *").closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Prénom, nom et courriel sont requis",
    );
    expect(registerToEvent).not.toHaveBeenCalled();
  });

  it("confirme l'inscription", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("Prénom *"), { target: { value: "Marie" } });
    fireEvent.change(screen.getByPlaceholderText("Nom *"), { target: { value: "Dupont" } });
    fireEvent.change(screen.getByPlaceholderText("Courriel *"), {
      target: { value: "marie@exemple.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    expect(await screen.findByText("Vous êtes inscrit à cet événement.")).toBeInTheDocument();
  });

  it("remonte l'erreur du serveur", async () => {
    registerToEvent.mockImplementation(() => Promise.reject(new Error("Événement complet")));
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("Prénom *"), { target: { value: "Marie" } });
    fireEvent.change(screen.getByPlaceholderText("Nom *"), { target: { value: "Dupont" } });
    fireEvent.change(screen.getByPlaceholderText("Courriel *"), {
      target: { value: "marie@exemple.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

// ── Membre connecté ──────────────────────────────────────────────────────────

describe("EventDetailPage — membre connecté", () => {
  beforeEach(() => {
    currentMember = makeMember();
  });

  it("s'inscrit d'un clic, sans saisir de coordonnées", async () => {
    await renderPage();
    expect(screen.queryByText("S'inscrire sans compte :")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));
    await waitFor(() => expect(registerToEvent).toHaveBeenCalledWith(7, undefined));
  });

  it("propose d'annuler quand il est déjà inscrit", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      { id: 1, event_id: 7, registered_at: "2026-01-02T10:00:00Z", event: { online_link: null } },
    ]);
    await renderPage();

    expect(
      await screen.findByRole("button", { name: "Annuler mon inscription" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "S'inscrire" })).not.toBeInTheDocument();
  });

  it("annule l'inscription et le confirme", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      { id: 1, event_id: 7, registered_at: "2026-01-02T10:00:00Z", event: { online_link: null } },
    ]);
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Annuler mon inscription" }));
    await waitFor(() => expect(cancelRegistration).toHaveBeenCalledWith(7));
    expect(await screen.findByText("Votre inscription a été annulée.")).toBeInTheDocument();
  });

  it("ignore une inscription portant sur un autre événement", async () => {
    fetchMyEventRegistrations.mockResolvedValue([
      { id: 1, event_id: 99, registered_at: "2026-01-02T10:00:00Z", event: { online_link: null } },
    ]);
    await renderPage();
    expect(screen.getByRole("button", { name: "S'inscrire" })).toBeInTheDocument();
  });
});

// ── Délai d'annulation ───────────────────────────────────────────────────────

describe("EventDetailPage — délai d'annulation dépassé", () => {
  beforeEach(() => {
    currentMember = makeMember();
    fetchMyEventRegistrations.mockResolvedValue([
      { id: 1, event_id: 7, registered_at: "2026-01-02T10:00:00Z", event: { online_link: null } },
    ]);
  });

  it("retire le bouton d'annulation et explique pourquoi", async () => {
    // Événement dans 2 h alors que le délai est de 24 h.
    await renderPage(makeEvent({ date_start: SOON, cancel_deadline_hours: 24 }));

    expect(await screen.findByText(/délai pour annuler.*est dépassé/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Annuler mon inscription" }),
    ).not.toBeInTheDocument();
  });

  it("garde le bouton et annonce le temps restant tant que le délai court", async () => {
    await renderPage(makeEvent({ date_start: FAR_FUTURE, cancel_deadline_hours: 24 }));

    expect(await screen.findByText(/Vous pouvez encore annuler/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler mon inscription" })).toBeInTheDocument();
  });

  it("applique le délai par défaut de 24 h quand l'événement n'en fixe aucun", async () => {
    await renderPage(makeEvent({ date_start: SOON, cancel_deadline_hours: null }));
    expect(await screen.findByText(/est dépassé/)).toBeInTheDocument();
  });
});

// ── Lien de connexion ────────────────────────────────────────────────────────

describe("EventDetailPage — lien en ligne", () => {
  const ONLINE_EVENT = makeEvent({
    format: "en_ligne",
    online_link: "https://meet.test/salle",
    location: null,
  });

  it("ne révèle pas le lien à un visiteur non inscrit", async () => {
    await renderPage(ONLINE_EVENT);
    expect(screen.queryByText(/Lien de connexion/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /meet\.test/ })).not.toBeInTheDocument();
  });

  it("révèle le lien renvoyé par l'inscription", async () => {
    registerToEvent.mockResolvedValue({ id: 1, online_link: "https://meet.test/salle" });
    await renderPage(ONLINE_EVENT);

    fireEvent.change(screen.getByPlaceholderText("Prénom *"), { target: { value: "Marie" } });
    fireEvent.change(screen.getByPlaceholderText("Nom *"), { target: { value: "Dupont" } });
    fireEvent.change(screen.getByPlaceholderText("Courriel *"), {
      target: { value: "marie@exemple.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

    expect(await screen.findByText(/Lien de connexion/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://meet.test/salle" })).toBeInTheDocument();
  });

  it("révèle le lien à un membre déjà inscrit dès le chargement", async () => {
    currentMember = makeMember();
    fetchMyEventRegistrations.mockResolvedValue([
      {
        id: 1,
        event_id: 7,
        registered_at: "2026-01-02T10:00:00Z",
        event: { online_link: "https://meet.test/salle" },
      },
    ]);
    await renderPage(ONLINE_EVENT);

    expect(
      await screen.findByRole("link", { name: "https://meet.test/salle" }),
    ).toBeInTheDocument();
  });
});

// ── Événement payant ─────────────────────────────────────────────────────────

describe("EventDetailPage — événement payant", () => {
  it("affiche le formulaire Zeffy quand il est configuré", async () => {
    await renderPage(makeEvent({ price: 25, zeffy_form_path: "/fr/donation-form/abc" }));

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("/fr/donation-form/abc");
  });

  it("n'affiche ni paiement ni inscription directe si le formulaire manque", async () => {
    // Payant mais sans zeffy_form_path : le bloc de paiement remplace le
    // formulaire d'inscription, et il est vide — l'inscription est donc
    // impossible tant que l'administrateur n'a pas renseigné le formulaire.
    await renderPage(makeEvent({ price: 25, zeffy_form_path: null }));

    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: "S'inscrire" })).not.toBeInTheDocument();
    expect(screen.queryByText("S'inscrire sans compte :")).not.toBeInTheDocument();
  });

  it("laisse l'inscription libre pour un événement gratuit", async () => {
    await renderPage(makeEvent({ price: 0 }));
    expect(screen.getByRole("button", { name: "S'inscrire" })).toBeInTheDocument();
  });
});

// ── Capacité ─────────────────────────────────────────────────────────────────

describe("EventDetailPage — capacité", () => {
  it("désactive l'inscription quand l'événement est complet", async () => {
    await renderPage(makeEvent({ capacity: 10, spots_left: 0 }));
    expect(screen.getByRole("button", { name: "S'inscrire" })).toBeDisabled();
  });

  it("affiche les places restantes quand le compteur est activé", async () => {
    await renderPage(
      makeEvent({ capacity: 10, spots_left: 3, show_registration_count: true }),
    );
    expect(screen.getByText("3 place(s) restante(s) sur 10")).toBeInTheDocument();
  });

  it("annonce « Événement complet » quand il ne reste aucune place", async () => {
    await renderPage(
      makeEvent({ capacity: 10, spots_left: 0, show_registration_count: true }),
    );
    expect(screen.getByText("Événement complet")).toBeInTheDocument();
  });
});
