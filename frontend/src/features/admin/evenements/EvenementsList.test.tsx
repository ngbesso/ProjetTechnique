import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvenementsList } from "./EvenementsList";
import type { Church, EventItem, ParameterValue } from "../../../types";

const loadAdmin = vi.fn();
const onCreate = vi.fn();
const onEdit = vi.fn();
const onDelete = vi.fn();
const onStatusChange = vi.fn();
const onOpenParticipants = vi.fn();
const onOpenVolunteers = vi.fn();

const CHURCHES: Church[] = [
  { id: 1, name: "Église centrale", district: "Centre", parent_id: null, is_mother: true, is_active: true } as Church,
];

const param = (id: number, label: string): ParameterValue =>
  ({ id, category: "x", label, position: id, restricted_to_sexe: null }) as ParameterValue;

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 1,
    title: "Retraite de printemps",
    description: null,
    category: "Retraite",
    date_start: "2099-05-03T10:00:00Z",
    date_end: null,
    location: "Montréal",
    instructor: null,
    intervenant_category: null,
    price: null,
    zeffy_form_path: null,
    church_id: 1,
    district: "Centre",
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
    created_by: 5,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:00:00Z",
    registered_count: 0,
    spots_left: null,
    image_url: null,
    ...overrides,
  } as EventItem;
}

function renderList(events: EventItem[], canManage = true) {
  render(
    <EvenementsList
      events={events}
      loadAdmin={loadAdmin}
      churches={CHURCHES}
      districtValues={[param(1, "Centre"), param(2, "Est")]}
      categoryValues={[param(3, "Retraite"), param(4, "Formation")]}
      canManage={canManage}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChange={onStatusChange}
      onOpenParticipants={onOpenParticipants}
      onOpenVolunteers={onOpenVolunteers}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("EvenementsList — actions selon la permission", () => {
  it("propose la création et les actions à un gestionnaire", () => {
    renderList([makeEvent()]);
    expect(screen.getByRole("button", { name: /Créer un événement/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
  });

  it("retire création et suppression sans la permission", () => {
    // Cas d'un profil qui consulte les événements sans event:manage.
    renderList([makeEvent()], false);
    expect(screen.queryByRole("button", { name: /Créer un événement/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("remonte la demande de suppression avec l'identifiant et le titre", () => {
    renderList([makeEvent({ id: 7, title: "Retraite de printemps" })]);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onDelete).toHaveBeenCalledWith(7, "Retraite de printemps");
  });

  it("remonte la demande de création", () => {
    renderList([makeEvent()]);
    fireEvent.click(screen.getByRole("button", { name: /Créer un événement/ }));
    expect(onCreate).toHaveBeenCalled();
  });
});

describe("EvenementsList — onglets de statut", () => {
  it("compte tous les événements par défaut", () => {
    renderList([
      makeEvent({ id: 1, status: "published" }),
      makeEvent({ id: 2, status: "draft", title: "Camp de jeunes" }),
    ]);
    expect(screen.getByText("Retraite de printemps")).toBeInTheDocument();
    expect(screen.getByText("Camp de jeunes")).toBeInTheDocument();
  });

  it("ne garde que les brouillons sur l'onglet correspondant", () => {
    renderList([
      makeEvent({ id: 1, status: "published" }),
      makeEvent({ id: 2, status: "draft", title: "Camp de jeunes" }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Brouillons/ }));

    expect(screen.getByText("Camp de jeunes")).toBeInTheDocument();
    expect(screen.queryByText("Retraite de printemps")).not.toBeInTheDocument();
  });

  it("revient à la liste complète via l'onglet « Tous »", () => {
    renderList([
      makeEvent({ id: 1, status: "published" }),
      makeEvent({ id: 2, status: "draft", title: "Camp de jeunes" }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Brouillons/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tous/ }));

    expect(screen.getByText("Retraite de printemps")).toBeInTheDocument();
    expect(screen.getByText("Camp de jeunes")).toBeInTheDocument();
  });
});
