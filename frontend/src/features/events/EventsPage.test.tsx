import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventsPage } from "./EventsPage";
import type { EventItem } from "../../types";

const getEvents = vi.fn();

vi.mock("../../lib/api/events", () => ({ getEvents: () => getEvents() }));
vi.mock("../../lib/api/churches", () => ({ fetchChurches: () => Promise.resolve([]) }));
vi.mock("../../components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("../../components/layout/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("../../context/RouterContext", () => ({ useNavigate: () => vi.fn() }));

// `load` doit rester stable : il figure dans les dépendances d'un useEffect.
const loadCategories = vi.fn();
vi.mock("../../hooks/useParameters", () => ({
  useParameters: () => ({ values: [], loading: false, error: "", load: loadCategories }),
}));

const FUTURE = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 1,
    title: "Retraite de printemps",
    description: null,
    category: "Retraite",
    date_start: FUTURE,
    date_end: null,
    location: "Montréal",
    instructor: null,
    intervenant_category: null,
    price: null,
    zeffy_form_path: null,
    church_id: 1,
    district: null,
    capacity: 10,
    show_registration_count: true,
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
    spots_left: 4,
    image_url: null,
    ...overrides,
  } as EventItem;
}

async function renderPage(event: EventItem) {
  getEvents.mockResolvedValue({ items: [event], total: 1, limit: 20, offset: 0 });
  render(<EventsPage />);
  await screen.findByText("Retraite de printemps");
}

beforeEach(() => vi.clearAllMocks());

describe("EventsPage — compteur d'inscrits activé", () => {
  it("affiche les places restantes", async () => {
    await renderPage(makeEvent({ show_registration_count: true, spots_left: 4 }));
    expect(screen.getByText("4 places restantes")).toBeInTheDocument();
  });

  it("accorde le singulier pour une seule place", async () => {
    await renderPage(makeEvent({ show_registration_count: true, spots_left: 1 }));
    expect(screen.getByText("1 place restante")).toBeInTheDocument();
  });

  it("affiche « Complet » quand il ne reste aucune place", async () => {
    await renderPage(makeEvent({ show_registration_count: true, spots_left: 0 }));
    expect(screen.getByText("Complet")).toBeInTheDocument();
  });

  it("affiche « Places illimitées » sans capacité définie", async () => {
    await renderPage(
      makeEvent({ show_registration_count: true, capacity: null, spots_left: null }),
    );
    expect(screen.getByText("Places illimitées")).toBeInTheDocument();
  });
});

describe("EventsPage — compteur d'inscrits désactivé", () => {
  it("masque les places restantes", async () => {
    await renderPage(makeEvent({ show_registration_count: false, spots_left: 4 }));
    expect(screen.queryByText(/place[s]? restante/)).not.toBeInTheDocument();
  });

  it("masque aussi le badge « Complet »", async () => {
    // Le badge trahirait le remplissage, que l'organisateur a choisi de taire.
    await renderPage(makeEvent({ show_registration_count: false, spots_left: 0 }));
    expect(screen.queryByText("Complet")).not.toBeInTheDocument();
  });

  it("masque « Places illimitées »", async () => {
    await renderPage(
      makeEvent({ show_registration_count: false, capacity: null, spots_left: null }),
    );
    expect(screen.queryByText("Places illimitées")).not.toBeInTheDocument();
  });

  it("laisse le reste de la carte intact", async () => {
    await renderPage(makeEvent({ show_registration_count: false }));
    expect(screen.getByText("Retraite de printemps")).toBeInTheDocument();
    expect(screen.getByText("Retraite")).toBeInTheDocument();
    expect(screen.getByText(/Montréal/)).toBeInTheDocument();
  });
});

describe("EventsPage — événements passés", () => {
  it("n'affiche pas les places restantes, compteur activé ou non", async () => {
    const past = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
    await renderPage(makeEvent({ date_start: past, show_registration_count: true }));
    await waitFor(() => expect(screen.getByText("Retraite de printemps")).toBeInTheDocument());
    expect(screen.queryByText(/place[s]? restante/)).not.toBeInTheDocument();
  });
});
