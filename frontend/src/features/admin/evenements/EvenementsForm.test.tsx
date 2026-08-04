import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvenementsForm } from "./EvenementsForm";
import { EMPTY } from "./shared";
import type { Church, EventInput, ParameterValue } from "../../../types";

const onSubmit = vi.fn();
const onCancel = vi.fn();

const CHURCHES: Church[] = [
  { id: 1, name: "Église centrale", district: "Centre", parent_id: null, is_mother: true, is_active: true } as Church,
];

const param = (id: number, label: string): ParameterValue =>
  ({ id, category: "x", label, position: id, restricted_to_sexe: null }) as ParameterValue;

const CATEGORIES = [param(1, "Retraite"), param(2, "Formation")];
const DISTRICTS = [param(3, "Centre"), param(4, "Est")];
const INTERVENANTS = [param(5, "Pasteur")];

const TITLE_PLACEHOLDER = "ex. : Camp de jeunes d'été";

function renderForm(initial: Partial<EventInput> = {}) {
  render(
    <EvenementsForm
      initialValue={{ ...EMPTY, ...initial }}
      initialImageUrl={null}
      isEditing={false}
      churches={CHURCHES}
      districtValues={DISTRICTS}
      categoryValues={CATEGORIES}
      intervenantCategoryValues={INTERVENANTS}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
}

/**
 * Passe à l'étape suivante. On soumet le formulaire plutôt que de cliquer sur
 * « Suivant » : les champs requis portent l'attribut `required`, et la
 * validation native de jsdom bloquerait le clic avant que validateStep — le
 * sujet de ces tests — ne s'exécute.
 */
function submitStep() {
  fireEvent.submit(document.querySelector("form")!);
}

const alertText = () => screen.queryByRole("alert")?.textContent ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit.mockResolvedValue(undefined);
});

describe("EvenementsForm — navigation entre étapes", () => {
  it("démarre sur l'étape Informations", () => {
    renderForm();
    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Suivant/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer l'événement/ })).not.toBeInTheDocument();
  });

  it("avance à l'étape suivante une fois l'étape valide", () => {
    renderForm({ title: "Retraite", category: "Retraite" });
    submitStep();
    expect(screen.queryByPlaceholderText(TITLE_PLACEHOLDER)).not.toBeInTheDocument();
  });

  it("revient à l'étape précédente sans perdre la saisie", () => {
    renderForm({ category: "Retraite" });
    fireEvent.change(screen.getByPlaceholderText(TITLE_PLACEHOLDER), {
      target: { value: "Retraite d'automne" },
    });
    submitStep();
    fireEvent.click(screen.getByRole("button", { name: /Précédent/ }));

    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toHaveValue("Retraite d'automne");
  });

  it("efface le message d'erreur en revenant en arrière", () => {
    renderForm({ category: "Retraite" });
    submitStep();
    expect(alertText()).toContain("Le titre est requis.");

    fireEvent.change(screen.getByPlaceholderText(TITLE_PLACEHOLDER), {
      target: { value: "Retraite" },
    });
    submitStep();
    fireEvent.click(screen.getByRole("button", { name: /Précédent/ }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("n'enregistre rien avant la dernière étape", () => {
    renderForm({ title: "Retraite", category: "Retraite" });
    submitStep();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("n'offre pas de retour arrière sur la première étape", () => {
    renderForm({ title: "Retraite", category: "Retraite" });
    expect(screen.queryByRole("button", { name: /Précédent/ })).not.toBeInTheDocument();

    submitStep();
    expect(screen.getByRole("button", { name: /Précédent/ })).toBeInTheDocument();
  });
});

describe("EvenementsForm — validation par étape", () => {
  it("exige le titre à la première étape", () => {
    renderForm({ category: "Retraite" });
    submitStep();
    expect(alertText()).toContain("Le titre est requis.");
  });

  it("exige la catégorie à la première étape", () => {
    renderForm({ title: "Retraite" });
    submitStep();
    expect(alertText()).toContain("La catégorie est requise.");
  });

  it("bloque tant que l'étape est invalide", () => {
    renderForm({ category: "Retraite" });
    submitStep();
    // Toujours sur l'étape 1 : le champ Titre est encore là.
    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeInTheDocument();
  });

  it("exige la date de début à la deuxième étape", () => {
    renderForm({ title: "Retraite", category: "Retraite" });
    submitStep();
    submitStep();
    expect(alertText()).toContain("La date de début est requise.");
  });

  it("exige le lien de connexion pour un événement en ligne", () => {
    renderForm({
      title: "Retraite",
      category: "Retraite",
      date_start: "2099-05-03T10:00",
      format: "en_ligne",
      online_link: "",
    });
    submitStep();
    submitStep();
    expect(alertText()).toMatch(/lien de connexion est requis/);
  });

  it("exige aussi le lieu pour un événement hybride", () => {
    renderForm({
      title: "Retraite",
      category: "Retraite",
      date_start: "2099-05-03T10:00",
      format: "hybride",
      online_link: "https://meet.test/x",
      location: "",
    });
    submitStep();
    submitStep();
    expect(alertText()).toMatch(/lieu est requis pour un événement hybride/);
  });

  it("laisse passer un présentiel sans lien de connexion", () => {
    renderForm({
      title: "Retraite",
      category: "Retraite",
      date_start: "2099-05-03T10:00",
      format: "presentiel",
    });
    submitStep();
    submitStep();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("EvenementsForm — enregistrement", () => {
  const VALID: Partial<EventInput> = {
    title: "Retraite",
    category: "Retraite",
    date_start: "2099-05-03T10:00",
    format: "presentiel",
  };

  /** Traverse les six étapes jusqu'à la révision. */
  function goToLastStep() {
    for (let i = 0; i < 5; i++) submitStep();
  }

  it("n'appelle onSubmit qu'à la dernière étape", async () => {
    renderForm(VALID);
    goToLastStep();
    expect(onSubmit).not.toHaveBeenCalled();

    submitStep();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("transmet les valeurs saisies", async () => {
    renderForm(VALID);
    goToLastStep();
    submitStep();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: "Retraite",
      category: "Retraite",
    });
  });

  it("annule sans rien enregistrer", () => {
    renderForm(VALID);
    fireEvent.click(screen.getByRole("button", { name: /Annuler/ }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
